# # Global Imports
from imports.glo import stripe,db,config,Flask,render_template,url_for,redirect,request,jsonify,abort,send_file

# Custom Imports
from main.users import user_manager,user_class
from main.events import event_manager,event_class,venue_class
from main.bookings  import booking_manager,bookings,entries

stripe.api_key = config.stripe_api_key

db.create_pool()
db.create_all()

app = Flask(__name__, template_folder = config.templates_folder, static_folder = config.statics_folder)
@app.route("/") 
def index(): return redirect(url_for("Home"))

# Home URL
@app.route("/Home") 
def Home():
    return render_template("home-temp.html")

# Events URL
@app.route("/Event",methods=['GET','POST'])  
def Event():
    # GET Requests
    if request.method == 'GET':     
        return render_template("event-temp.html")    

    # POST Requests -> to ONLY return all events
    return jsonify(event_manager.get_all_events())

# Settings URL
@app.route("/Settings") 
def Settings():
    return render_template("settings-temp.html")

# Account URL
@app.route("/Account",methods=['GET','POST']) 
@user_manager.login_required
def Account():
    # 1. Get user id
    userInfo = config.users_db[user_manager.get_id()]   

    # GET
    if request.method == 'GET':
        return render_template("user-acc-temp.html") if userInfo['Permission']  == 'Standard' else render_template("admin-acc-temp.html")

    # POST
    if request.method != 'POST': return jsonify({})

    if request.json['OP'] == 'GET_USER_PROFILE':
        bookingInfo = (
            db.query(bookings.eventID,bookings.bookingStatus,bookings.bookingID)
            .where(bookings.userID == user_manager.get_id()).all(as_dict=True)
        )
        return user_manager.get_user_profile(userInfo, bookingInfo)

    if request.json['OP'] == 'GET_ADMIN_PROFILE':
        all_users = db.query(user_class).all(as_dict=True)
        all_bookings = db.query(bookings).all(as_dict=True)
        return jsonify({
            'users' : all_users, 
            'events' : config.events_db, 
            'bookings' : bookings.convert_all(all_bookings)
        })
    
    if request.json['OP'] == 'GET_ADMIN_REPORT':
        all_bookings = db.query(bookings).all(as_dict=True)
        all_booking_entries = db.query(entries).all(as_dict=True)
        all_venues = db.query(venue_class).all(as_dict=True)

        return jsonify({
           'events' : config.events_db, 
           'venues' : all_venues,
           'bookedEvents' : bookings.convert_all(all_bookings), 
           'bookingEntries' : bookings.convert_all(all_booking_entries), 
        })

# Operation Actions
@app.route("/actions",methods=['POST'])     
@user_manager.login_required
def actions():
    # 1. Get User Perm
    userInfo = config.users_db[user_manager.get_id()]
    
    # 2. Get Event ID
    admin = userInfo['Permission'] == "admin" 
    ID, EID, OP = request.json['ID'], request.json['EID'],request.json['OP']  

    match OP:
        case 'CANCEL_BOOKING':
            booking_manager.cancel_booking(ID,int(EID))
            return jsonify({"message" : "Cancellation Successful!"})  
        
        case 'ADD_EVENT':
            if not admin: return
            print("add_event")

        case 'EDIT_EVENT':
            if not admin: return
            print("edit_event")

        case 'DELETE_EVENT':
            if not admin: return
            print("del_event")

        case 'EDIT_USER_DETAILS':
            if not admin: return
            print("edit_user")

        case 'EDIT_USER_PASSWORD':
            if not admin: return
            print("edit_user_password")

# Login URL
@app.route("/Users",methods=['GET','POST']) 
def User():
    # GET Requests
    if request.method == 'GET':     
        return render_template("login-temp.html")
    
    # POST Requests
    data = request.json

    if data['mode'] == 'signup':
       return jsonify(user_manager.signUp(request))

    return jsonify(user_manager.signIn(request))

# Booking URL
@app.route("/Booking",methods=['GET','POST']) 
@user_manager.login_required
def Booking():
    # GET Requests
    if request.method == 'GET':  
        return render_template("booking-temp.html") 

    # POST Requests
    eventName = request.json

    evaluation = booking_manager.check_user_status(request,eventName) 
    eventDetails, Addons = event_manager.get_event(eventName)
    return jsonify({
        'eventDetails' : eventDetails,
        'eventAddons' : Addons,
        'discounts' : booking_manager.get_discounts(),
        'available' : evaluation.get('available'),
        'booked' : evaluation.get('booked'),
    })


@app.route("/Booking/Checkout",methods=['GET','POST']) 
@user_manager.login_required
def checkout():
    # 1. Get the Booking Info
    data = request.json
    
    # 2. Insert booking info
    response = booking_manager.insert_booking_info(data)
    booking_ref, total_price = response.booking_ref, response.totalPrice
    
    if total_price > 0:
        try:
            intent = stripe.PaymentIntent.create(
                amount= int(total_price * 100),
                currency='GBP',
                automatic_payment_methods={'enabled' : True},
                metadata={
                    'ref' : f"{booking_ref}"
                }
            )

            event_manager.update_events_cache() 
            return jsonify({
                'client_secret' : intent['client_secret'], 
                'key' : config.stripe_pub_key,
            } | response._asdict())
        
        except stripe.error.PermissionError as e:
            print(f"Permission Error: {e}")
            return

        except Exception as e:
            print(f"Other Error: {e}")
            return
    
    event_manager.update_events_cache() 
    booking_manager.update_payment_status(booking_ref)
    return jsonify(response._asdict())
    
@app.route("/payment-webhook", methods=['POST'])
def webhook():
    sig = request.headers.get('stripe-signature')
    payload = request.data

    # 1. Verify Signature
    try:
        event = stripe.Webhook.construct_event(payload, sig, config.stripe_endpoint_secret)
        if event.get('type') == 'payment_intent.succeeded':
            ref = event.get('data').get('object').get('metadata').get('ref')

            booking_manager.update_payment_status(ref)

    except ValueError as e:
        return jsonify(error=str(e)), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return jsonify(error=str(e)), 400       

    return jsonify(success=True), 200  

@app.route('/download-ticket')
def download_ticket():
    buffer = booking_manager.get_booking_ticket()
    return send_file(buffer,'application/pdf',False)

# Set all required statics
booking_manager.insert_all_static()    
event_manager.insert_all_static()

event_manager.update_events_cache()
booking_manager.update_booking_cache()
user_manager.update_users_cache()

if __name__ == "__main__":
    app.run(debug=True)
