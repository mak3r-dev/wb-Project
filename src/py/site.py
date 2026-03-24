# =======================================
# 1. IMPORTS
# =======================================
from imports.glo import stripe,db,config,Flask,render_template,url_for,redirect,request,jsonify,abort,send_file,islice

from main.users import user_manager,user_class
from main.events import event_manager,event_class,venue_class
from main.bookings  import booking_manager,bookings,entries


# =======================================
# 2. CONFIGURATION AND CONSTANTS
# =======================================
app = Flask(__name__, template_folder = config.templates_folder, static_folder = config.statics_folder)

@app.route("/") 
def index(): return redirect(url_for("Home"))

stripe.api_key = config.stripe_api_key

db.create_pool(); 
db.create_all()
 
# Set all required statics
booking_manager.internal_actions(OP='INSERT_DEFAULTS')    
booking_manager.internal_actions(OP='CACHE_DISCOUNTS')

event_manager.internal_actions(OP='INSERT_DEFAULTS')
event_manager.internal_actions(OP='CACHE_ALL')

user_manager.internal_actions(OP='INSERT_DEFAULTS')   
user_manager.internal_actions(OP='CACHE_ALL')

# =======================================
# 3. VISIBLE ENDPOINTS
# =======================================

# Home URL
@app.route("/Home",methods=['GET','POST']) 
def Home():
    # GET Requests
    if request.method == 'GET':     
        return render_template("home-temp.html")
    
    # POST Requests -> to ONLY return all Featured Events
    ftEvents = {}
    for k, event in config.events_db.items():
        if not event['eventFt']: continue
        ftEvents[k] = event

    five_questions = dict(islice(config.FAQ_db.items(), 5))
    return jsonify({'events' : ftEvents, 'FAQ' : five_questions})

# Events URL
@app.route("/Event",methods=['GET','POST'])  
def Event():
    # GET Requests
    if request.method == 'GET':     
        return render_template("event-temp.html")    

    # POST Requests -> to ONLY return all events
    return jsonify(event_manager.get_all_events())

# About Us URL
@app.route("/About") 
def About():
    return render_template("about-us-temp.html")

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
        all_bookings = db.query(bookings).all(as_dict=True)
        all_booking_entries = db.query(entries).all(as_dict=True)
    
        event_class.convert_all(all_bookings)
        return jsonify({
            'users' : config.users_db, 
            'events' : config.events_db, 
            'bookings' : bookings.convert_all(all_bookings),
            'bookingEntries' : bookings.convert_all(all_booking_entries), 
        })
    
    if request.json['OP'] == 'GET_ADMIN_REPORT':
        all_bookings = db.query(bookings).all(as_dict=True)
        all_booking_entries = db.query(entries).all(as_dict=True)

        event_class.convert_all(all_bookings)
        return jsonify({
           'events' : config.events_db, 
           'venues' : config.venues_db,
           'bookedEvents' : bookings.convert_all(all_bookings), 
           'bookingEntries' : bookings.convert_all(all_booking_entries),  
        })

# Settings URL
@app.route("/Settings") 
@user_manager.login_required
def Settings():
    return render_template("settings-temp.html")

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

# =======================================
# 4. HIDDEN ENDPOINTS
# =======================================
# Help Page URL
@app.route("/Help",methods=['GET','POST']) 
def Help():
    # GET Requests
    if request.method == 'GET':  
        return render_template("help-temp.html") 

    # POST Requests -> to ONLY return FAQ
    return jsonify(user_manager.get_FAQ()) 
    
# Booking Page URL
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

# Booking Checkout URL
@app.route("/Booking/Checkout",methods=['GET','POST']) 
@user_manager.login_required
def checkout():
    # 1. Get the Booking Info
    ACTION_TYPE, DATA = request.json['ACTION_TYPE'], request.json['DATA']
    
    # 2. Check Action
    if ACTION_TYPE == 'CALCULATE_TOTAL':
        response = booking_manager.final_booking_sequence(ACTION_TYPE,DATA)
        booking_ref, total_price = response.booking_ref, response.totalPrice

        # Paid Events
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
        
        # Free Events
        return jsonify(response._asdict())
    
    if ACTION_TYPE == 'INSERT_INFO':
        REF = request.json.get('REF')
        
        response = booking_manager.final_booking_sequence('INSERT_INFO',DATA,REF)
        booking_manager.action(OP='UPDATE_PAYMENT_STATUS',ID=REF,DATA={})
        return jsonify(response._asdict())

# Booking Payment URL Webhook
@app.route("/payment-webhook", methods=['POST'])
def webhook():
    sig = request.headers.get('stripe-signature')
    payload = request.data

    # 1. Verify Signature
    try:
        event = stripe.Webhook.construct_event(payload, sig, config.stripe_endpoint_secret)
        if event.get('type') == 'payment_intent.succeeded':
            ref = event.get('data').get('object').get('metadata').get('ref')

            booking_manager.action(OP='UPDATE_PAYMENT_STATUS',ID=ref,DATA={})

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

# =======================================
# 4. UTILITY ENDPOINT
# =======================================

# Admin and User Account Actions
@app.route("/actions",methods=['POST'])     
@user_manager.login_required
def actions():
    perm = config.users_db[user_manager.get_id()]['Permission']   
    ACTION = request.json['ACTION']
    ID, OP, DATA = request.json['ID'], request.json['OP'], request.json['DATA']  

    if ACTION == 'EVENT_ACTION':
        return jsonify(event_manager.action(perm,OP,ID,DATA))

    if ACTION == 'USER_ACTION':
        return jsonify(user_manager.action(perm,OP,ID,DATA))
    
    if ACTION == 'BOOKING_ACTION':
        print(f"booking-act -> {OP}, data -> {DATA} id -> {ID}")
        return jsonify(booking_manager.action(OP,ID,DATA))  

if __name__ == "__main__": app.run(debug=True)