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

# Operation Actions
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
    response = booking_manager.action(OP='ADD_BOOKING',ID=user_manager.get_id(),DATA=data)
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
    
    booking_manager.action(OP='UPDATE_PAYMENT_STATUS',ID=booking_ref,DATA={})
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

# Set all required statics
booking_manager.internal_actions(OP='INSERT_DEFAULTS')    
booking_manager.internal_actions(OP='CACHE_DISCOUNTS')
event_manager.internal_actions(OP='INSERT_DEFAULTS')
event_manager.internal_actions(OP='CACHE_ALL')
user_manager.internal_actions(OP='CACHE_ALL')

if __name__ == "__main__":
    app.run(debug=True)