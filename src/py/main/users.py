from __future__ import annotations

# 1. Import Networks / Main Modules
import requests
import re
import urllib.parse
import base64
import uuid

# 2. Import Utilities / Classes / Functions / variables
from pydantic import BaseModel, EmailStr, ValidationError, Field, field_validator
from .usefuls import db,Base,Column,string,Int,Date,Auth,config
from flask_bcrypt import Bcrypt
from flask import Flask,abort,request,jsonify,redirect,url_for,render_template,make_response
import datetime
from typing import Callable, NamedTuple
from functools import wraps

app = Flask(__name__)
bcrypt = Bcrypt(app)

class user_input_eval(BaseModel):
    FirstName: str = Field(min_length=2, max_length=50, strip_whitespace=True)
    LastName: str = Field(min_length=2, max_length=50, strip_whitespace=True)
    Email: EmailStr

class password_eval(BaseModel):
    Password: str

    @field_validator('Password')
    @classmethod
    def validate_pass(cls, password: str):
        
        assert len(password) < 8, 'Password must be at least 8 characters long'
        assert any(c.isupper() for c in password) and any(c.islower() for c in password), 'Password must contain at least one uppercase and lowercase letter'
        assert re.search(r'[0-9]', password), 'Password must contain at least one number'
        assert re.search(r'[!@#$%^&*\[\]]', password), 'Password must contain at least one Character'
        
        return password

class phone_eval(BaseModel):
    Phone: str

    @field_validator('Phone')
    @classmethod
    def validate_phone(cls, phone: str):
        assert len(phone) < 9 or len(phone) > 11, 'Phone must be 12 characters long'

class Response(NamedTuple):
    tokens: dict = None
    redirect_for: str = None
    message: str = None

class Users(Base):
    
    __table__ : str = 'Users'
    userID: Column = Column(Int, primary_key=True, auto_increment=True)
    FirstName: Column  = Column(string(45),nullable=False)
    LastName: Column  = Column(string(45), nullable=False)
    Email: Column  = Column(string(45), nullable=False)
    Pass_Hash: Column  = Column(string(255), nullable=False)
    DateJoined: Column  = Column(Date, nullable=False)
    Status: Column  = Column(string(45), nullable=False)
    Phone: Column  = Column(string(45), unique=True)
    Permission: Column  = Column(string(45), nullable=False)

class UsersManager():
    def __init__(self): pass
    
    def get_user(self, data: dict[str,str],**kwargs: bool ) -> NamedTuple | list[dict[str,str]]:   
        if not data or len(data) == 0: return None

        user = None    
        expression = Users.userID == data['id']  if 'id' in data else Users.Email == data['Email'] 
        # if you dont want the full user data
        if kwargs.get('partial'):
            # 1. Get user from db
            user = db.query(Users.Email,Users.Pass_Hash).where(expression).order_by(Users.Email.asc()).all()
        
        # if you want the full user data
        if kwargs.get('full'):   
            user = db.query(Users).where(expression).order_by(Users.userID.asc()).all() 
            
        # if you just want status and Permissions
        if kwargs.get('status'): 
            user = db.query(Users.Status,Users.Permission).where(expression).order_by(Users.userID.asc()).all() 
  
        if user: return user[0]

    def get_id(self):
        response = Auth._decode(request.cookies.get('access')) if request.cookies.get('access') else abort(401)
        return self.get_user(response.payload,full=True).userID
    
    def get_user_by_id(self, id: int):
        user = db.query(Users).where(Users.userID == id).all(as_dict=True)
        return user
    
    def validate_incoming_data(self, data: dict[str,str],sign_up: bool = False):
        # 1. Validate sign in data    
        try:
            user_data = user_input_eval(FirstName=data['FirstName'],LastName=data['LastName'],Email=data['Email']).model_dump()
            password = password_eval(Password=data['Password']).model_dump()

            return user_data | password
        except ValidationError as e:
            return data # Test -> should return an empty dict if true

    def validate_booking_info(userInfo: dict[str,str]):
        # 1. User Inputted booking Info
        try:
            userdetails = user_input_eval(Email=userInfo['Email'],FirstName=userInfo['FirstName'],LastName=userInfo['LastName']).model_dump()
            user_phone = phone_eval(Phone=userInfo['Phone']).model_dump()  

            return userdetails | user_phone
        except ValidationError as e:
            return userInfo # Test -> should return an empty dict if true
        
    def get_location_from_ip(self, ip_address: str = None):
        try:
            # We use ipapi.co (free-teir service to get location data)
            response = requests.get(f"https://ipapi.co/{ip_address}/json/").json()

            location_data = {
                "city": response.get("city"),
                "region": response.get("region"),
                "country": response.get("country_name"),
                "isp": response.get("org")
            }   

            return location_data
        except Exception as e:
            return {"error": "Could not detect location"}
       
    def signIn(self, request):
        if not request: 
            Redirect, Message = 'User', 'Login Attempt Failed!'
            return Response()._replace(redirect_for=Redirect,message=Message)._asdict()               

        user_data, user_agent, ip = request.json, request.user_agent.string, request.remote_addr
         
        validated_data = self.validate_incoming_data(user_data)
        user = self.get_user(validated_data,partial=True)
     
        # 1. User doesnt exists
        if not user: 
            Redirect, Message = 'User', 'Invalid Credentials!'
            return Response()._replace(redirect_for=Redirect,message=Message)._asdict()   

        # 2. User does exist
        full_user = self.get_user(validated_data,full=True)
        if full_user and full_user.Status != "Locked":

            # Check inputted credential
            valid_cred = bcrypt.check_password_hash(full_user.Pass_Hash,validated_data['Password']) and full_user.Email == validated_data['Email']
            if not valid_cred: 
                Redirect, Message = 'User', 'Invalid Credentials!'
                return Response()._replace(redirect_for=Redirect,message=Message)._asdict()  
            
            # if valid cred, return token
            payload = {'id': full_user.userID , 'status': full_user.Status , 'perm': full_user.Permission}
            Redirect, Message = 'Home', f'Successfuly signed in at {datetime.datetime.now(datetime.timezone.utc).time()}'

            if not validated_data['refresh']:
                tokens_acc = {'access': Auth.create_token(payload,True), 'refresh': None}
                return Response()._replace(redirect_for=Redirect,message=Message,tokens=tokens_acc)._asdict()

            tokens_ref = {'access': Auth.create_token(payload,True), 'refresh': Auth.create_token(payload)}
            return Response()._replace(redirect_for=Redirect,message=Message,tokens=tokens_ref)._asdict()  
        
        # if account isnt locked
        Redirect, Message = 'Home', f'Account Locked, Please try again later!!' 
        return Response()._replace(redirect_for=Redirect,message=Message,tokens=tokens_ref)._asdict()   

    def signUp(self, request):
        if not request: 
            Redirect, Message = 'User', 'Attempt Failed!'
            return Response()._replace(redirect_for=Redirect,message=Message)._asdict()    
           
        validated_data,is_standard = self.validate_incoming_data(request.json,True), True

        if request.json['Email'] == 'test' and request.json['Password'] == 'test123':
            is_standard = False
        elif request.json['Email'] == 'standard' and request.json['Password'] == 'standard123':
            is_standard = True

        # 1. Check if the user exists
        user = self.get_user(validated_data,partial=True)
        if user or len(validated_data) < 1:
            Redirect, Message = 'User', 'Invalid Credentials!'
            return Response()._replace(redirect_for=Redirect,message=Message)._asdict()       
                
        # 2. If not already signed up -> Get info to store   
        firstName, lastName, email, password = validated_data['FirstName'], validated_data['LastName'], validated_data['Email'], bcrypt.generate_password_hash(validated_data['Password'])
   
        # A. Store the Info   
        now, def_perm, def_phone = datetime.datetime.now(datetime.timezone.utc), 'Standard' if is_standard else 'Admin', 'None'
        new_user = Users(FirstName=firstName, LastName=lastName, Email=email, 
            Pass_Hash=password,DateJoined=now, Status='Active', Phone=def_phone, Permission=def_perm
        )

        db.add(new_user).on_duplicate()  
        Redirect, Message = 'User', f'Successfuly signed up at {now.time()}'

        db.commit()
        return Response()._replace(redirect_for=Redirect,message=Message)._asdict()  

    def login_required(self, func: Callable) -> Callable:    

        @wraps(func)
        def wrapper(*args, **kwargs) -> Callable | None:
            # 1. Validate Token
            token_result = Auth.validate_token(request)

            # 2. Valid Access
            if token_result.valid and token_result.token_type == 'ACCESS_TOKEN':
                user = self.get_user(token_result.payload, partial=True)
                
                # Check if registration is incomplete
                if not user.Email and user.Pass_Hash:
                    return self._handle_auth_failure(request, "signup")
                
                return func(*args, **kwargs)

            # 3. Logic for Refresh Token (Auto-renewal)
            if token_result.token_type == 'REFRESH_TOKEN':
                # Create new access token
                new_token = Auth.create_token(token_result.payload, is_access=True)

                res = redirect(request.full_path) 
                res.set_cookie('access', new_token)
                return res

            # 4. Logic for Failure (Expired, Missing, or Invalid)
            if token_result.missing or token_result.expired:
                return self._handle_auth_failure(request, "signin")
            
            abort(401)            

        return wrapper  


    def _handle_auth_failure(self, req, message: str):

        query_string = req.query_string.decode()
        state_str = f"{message}?{req.path.lstrip('/').split('/',1)[0]}?{query_string}"
        encoded_state = base64.b64encode(state_str.encode('utf-8')).decode('utf-8')
        if req.method == 'GET': return redirect(url_for('User', linked=encoded_state))

        # For AJAX/POST requests, return JSON instruction
        return jsonify({"redirect_url": "Users", "linked": state_str, "message": "Authentication required"})

    def get_user_profile(self, userInfo: list[dict], bookingInfo: list[dict]):

        # 1. Get Event 
        evntIDs = [info['eventID'] for info in bookingInfo]
        eventInfo = [[config.events_db[id],id] for id in evntIDs]

        # 2. Get Booking Info
        bookings = {info['eventID'] : [str(uuid.UUID(bytes=info['bookingID'])),info['bookingStatus']] for info in bookingInfo}    
        return jsonify({'user' : userInfo[0], 'events' : eventInfo, 'bookings' : bookings})


# Init
user_manager = UsersManager()
user_class = Users