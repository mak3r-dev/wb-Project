# Modules
from imports.glo import *

# Add - ons -> Static
class AddOns(Base):
    
    __table__ = 'AddOns'
    addId = Column(Int, primary_key=True, auto_increment=True)
    Name = Column(string(70), nullable=False, unique=True, default='None')
    addOnDesc = Column(string(255))
    Price = Column(Int, nullable=False)
    PriceDesc = Column(string(70), nullable=False)
    Category = Column(string(70), nullable=False)

# Event Add Ons
class eventAddOns(Base):

    __table__ = 'eventAddOns'
    eventID = Column(Int,ForeignKey('events.eventID', 'CASCADE', 'CASCADE'))
    addID = Column(Int,ForeignKey('AddOns.addId', 'CASCADE', 'CASCADE'))

    const = Constraint(unique('eventAddonPair','eventID','addID'))
    
# Suitability Table -> Static
class suitability(Base):

    __table__ = 'suitability'
    suitabilityID = Column(Int, primary_key=True, auto_increment=True)
    suitabilityName = Column(string(50), nullable=False, unique=True)

# Suitable - Venue Joined Table -> Dynamic
class suitableVenues(Base):

    __table__  = 'suitableVenues'
    venueID = Column(Int,ForeignKey('venues.venueID','cascade','cascade'))
    suitabilityID = Column(Int,ForeignKey('suitability.suitabilityID','no action','cascade'))

    const = Constraint(unique('venuesuitPair','venueID','suitabilityID'))

# Venues Table -> Dynamic
class Venues(Base):
    
    __table__ = 'venues'
    venueID = Column(Int, primary_key=True, auto_increment=True)
    venueName = Column(string(54), nullable=False, unique=True)
    venueCapacity = Column(Int, nullable=False)
    venueAddress = Column(string(70), nullable=False)

# Events Table -> Dynamic
VENUE_KEYS = frozenset({'venueName', 'venueCapacity', 'venueAddress'})
SUITABILITY_KEYS = frozenset({'suitabilityID', 'suitabilityName'})

class Events(Base):
    
    __table__ = 'events'
    eventID = Column(Int, primary_key=True, auto_increment=True)
    eventName = Column(string(54), nullable=False, unique=True)
    eventDesc = Column(string(255))
    eventPrice = Column(Int, nullable=False)
    eventStart = Column(Date, nullable=False)
    eventEnd = Column(Date, nullable=False)
    eventStatus = Column(string(27), nullable=False)
    eventOrganizers = Column(string(170), nullable=False)
    eventRating = Column(string(27), nullable=False)
    eventAvailability =  Column(Int, nullable=False)
    eventFt = Column(TinyINT, nullable=False)
    venueID = Column(Int, ForeignKey('venues.venueID','cascade','cascade'))

    def cache_event(id: int):
        ev = (db.query(event_class, venue_class, suitability)
            .join(venue_class, venue_class.venueID == event_class.venueID)
            .join(suitableVenues, suitableVenues.venueID == event_class.venueID)
            .join(suitability, suitableVenues.suitabilityID == suitability.suitabilityID)
            .where(event_class.eventID == id)
            .all(as_dict=True)
        )  

        config.events_db[ev[0]['eventID']] = ev[0]
        # print(f"ev-cache -> {id}, data -> {config.events_db[ev[0]['eventID']]}\n")

    def cache_venue(id: int):
        v = (db.query(Venues, suitability.suitabilityName)
            .join(suitableVenues, suitableVenues.venueID == Venues.venueID)
            .join(suitability, suitableVenues.suitabilityID == suitability.suitabilityID)
            .where(Venues.venueID == id)
            .all(as_dict=True)
        )
        
        config.venues_db[v[0]['venueName']] = v[0]
        # print(f"v-cache -> {id}, data -> {config.venues_db[v[0]['venueName']]}\n")

    def cache_suitability(id: int):
        sui = (db.query(suitability)
            .where(suitability.suitabilityID == id).all(as_dict=True)
        )

        config.suitability[sui[0]['suitabilityName']] = sui[0]['suitabilityID']
        # print(f"s-cache -> {sui[0]['suitabilityName']}, data -> {config.suitability[sui[0]['suitabilityName']]}\n")

    def cache_addon(id: int):
        add = (db.query(suitability)
            .where(suitability.suitabilityID == id).all(as_dict=True)
        )       
        config.add_ons_db[add[0]['addId']] = add[0]

    def cache_event_addons(id: int):
        event_addon = (db.query(event_class,AddOns)
            .join(eventAddOns, eventAddOns.eventID == event_class.eventID)
            .join(AddOns, eventAddOns.addID == AddOns.addId)
            .where(Events.eventID == id).all(as_dict=True)
        )
        config.event_addons_map[event_addon[0]['eventID']].add(event_addon[0]['addId'])    

    def insert_events(event_data_list: dict[int,dict[str,str]]) -> None:
        if not event_data_list: return

        vids, eids, suids = set(),set(),set()
        for _, entry in event_data_list.items():
            entry['eventStart'] = datetime.datetime.fromisoformat(entry['eventStart']).date().isoformat()
            entry['eventEnd'] = datetime.datetime.fromisoformat(entry['eventEnd']).date().isoformat()

            if 'suitabilityID' in entry: entry.pop('suitabilityID')  
            if 'eventID' in entry: entry.pop('eventID')           
            if 'venueID' in entry: entry.pop('venueID') 

            # Separate Venue, Suitability, and Event data
            venue_payload = {k: v for k, v in entry.items() if k in VENUE_KEYS}
            event_payload = {k: v for k, v in entry.items() if k not in VENUE_KEYS and k not in SUITABILITY_KEYS}

            venue_name = venue_payload.get('venueName')
            venue_id = None

            if venue_name:
                if venue_name in config.venues_db:
                    venue_id = config.venues_db[venue_name]
                else:
                    new_venue = Venues(venue_payload)
                    db.add(new_venue).on_duplicate()
                    venue_id = db.flush()
                    vids.add(venue_id)

            if venue_id: event_payload['venueID'] = venue_id

            # Insert Event  
            new_event = Events(event_payload)
            db.add(new_event).on_duplicate()
            ev_id = db.flush()
            eids.add(ev_id)

            if not venue_id: return
            sui_id = None
            if entry.get('suitabilityName') in config.suitability:
                sui_id = config.suitability[entry.get('suitabilityName')]
            else:
                new_suitability = suitability({'suitabilityName' : entry.get('suitabilityName')})
                db.add(new_suitability).on_duplicate()
                sui_id = db.flush()
                suids.add(sui_id)

            new_suitable = suitableVenues(venueID=venue_id, suitabilityID=sui_id)  
            db.add(new_suitable).on_duplicate() 
            
        db.commit()

        for id in eids: Events.cache_event(id)
        for id in vids: Events.cache_venue(id)
        for id in suids: Events.cache_suitability(id)
        
        return Action()._replace(message='Inserted Events Successfully',OP='ADD_EVENT')._asdict()

    def edit_event(id: int, data: dict):
        if id > len(config.events_db): return

        prevVenue = config.events_db[id]['venueName']
        for key, val in data.items():
            if (key == 'eventStart' or key =='eventEnd'):
                val = datetime.datetime.fromisoformat(val).date().isoformat()

            # If no change is required continue
            if config.events_db[id][key] == val: continue   

            # 1. update cached data
            if key not in VENUE_KEYS and key not in SUITABILITY_KEYS and key != 'venueName':
                config.events_db[id][key] = val
                db.update(getattr(Events, key) == val).where(Events.eventID == id).all()

            if key == 'venueName':
                config.events_db[id]['venueID'] = config.venues_db[val]['venueID']
                db.update(Events.venueID == config.events_db[id]['venueID']).where(Events.eventID == id).all()

                config.events_db[id]['venueName'] = val
                config.events_db[id]['venueCapacity'] = config.venues_db[val]['venueCapacity']
                config.events_db[id]['venueAddress'] = config.venues_db[val]['venueAddress']
                config.events_db[id]['suitabilityID'] = config.suitability[config.venues_db[val]['suitabilityName']]
                config.events_db[id]['suitabilityName'] = config.venues_db[val]['suitabilityName']

            newVenue = config.events_db[id]['venueName']
            if prevVenue == newVenue and key in VENUE_KEYS and key != 'venueName': 
                config.events_db[id][key] = val
                config.venues_db[newVenue][key] = val

                db.update(getattr(Venues, key) == val).where(Venues.venueID == config.venues_db[newVenue]['venueID']).all() 

        db.commit()
        return Action()._replace(message='Edited Event Successfully',OP='EDIT_EVENT')._asdict()
    
    def delete_event(id: int):
        print(id)
        if id > len(config.events_db): return
        config.events_db[id]['eventStatus'] = 'Deleted'
        (db.update(Events.eventStatus == 'Deleted').where(Events.eventID == id).all())

        db.commit()
        return Action()._replace(message='Deleted Event Successfully',OP='DELETE_EVENT')._asdict() 

    def update_availability(id:int, val: int):
        if not isinstance(val,int): return
        if id > len(config.events_db): return

        config.events_db[id]['eventAvailability'] = val
        (db.update(Events.eventAvailability == (config.events_db[id]['eventAvailability'] + val))
         .where(Events.eventID == id).all()) 
        db.commit()
            
    def get_event_caches() -> None:

        # 1. Get & set all Add-ons
        add_ons = db.query(AddOns).all(as_dict=True)
        for addOn in add_ons:
            config.add_ons_db[addOn['addId']] = addOn

        # 2. Get & set all events
        events = (db.query(event_class, venue_class, suitability)
            .join(venue_class, venue_class.venueID == event_class.venueID)
            .join(suitableVenues, suitableVenues.venueID == event_class.venueID)
            .join(suitability, suitableVenues.suitabilityID == suitability.suitabilityID)
            .all(as_dict=True)
        )   

        for ev in events:
            config.events_db[ev['eventID']] = ev

        config.EVENT_NAME_INDEX = {details['eventName']: evt_id for evt_id, details in config.events_db.items()}

        # 3. Get & set all Addons
        addons = (db.query(AddOns).all(as_dict=True))
        for addOn in addons:
            config.add_ons_db[addOn['addId']] = addOn

        # 4. Get & set all events Addons
        events_addon = (db.query(event_class,AddOns)
            .join(eventAddOns, eventAddOns.eventID == event_class.eventID)
            .join(AddOns, eventAddOns.addID == AddOns.addId)
            .all(as_dict=True)
        )

        config.event_addons_map = {i + 1 : set() for i in range(0,len(config.events_db)) }
        for addon in events_addon:    
            config.event_addons_map[addon['eventID']].add(addon['addId'])        

        # 5. Get & set all venues
        venues = (db.query(Venues,suitability.suitabilityName)
            .join(suitableVenues, suitableVenues.venueID == Venues.venueID)
            .join(suitability, suitableVenues.suitabilityID == suitability.suitabilityID)
            .all(as_dict=True)
        )
        for venue in venues:
            config.venues_db[venue['venueName']] = venue 

        # 6. Get & set all suitability
        suitabilities = db.query(suitability).all(as_dict=True)
        for sui in suitabilities:
            config.suitability[sui['suitabilityName']] = sui['suitabilityID']
    
    def insert_all_static() -> None:
        # 1. Insert sui... and add_ons and commit
        # [db.add(suitability({'suitabilityName' : name})).on_duplicate() for name in config.suitability.keys()]
        [db.add(AddOns(data)).on_duplicate() for data in config.add_ons_db.values()]
        
        db.commit()

        # 2. Insert Events and its addons
        Events.insert_events(config.events_db)
        db.flush()

        event_addon_instances = [
            eventAddOns({'eventID': eventID, 'addID': aid})
            for eventID, addon_ids in config.event_addons_map.items()
            for aid in addon_ids
        ]
        
        if not event_addon_instances: return
        for obj in event_addon_instances:
            db.add(obj).on_duplicate()

        db.commit()
    
class EventsManager:
    def __init__(self): pass

    def get_event(self, eventName: str) -> tuple[dict | None, list[dict]]:

        event_id = config.EVENT_NAME_INDEX.get(eventName)
        if event_id is None: return None, []

        event_data = config.events_db.get(event_id).copy()   
        event_data['eventID'] = event_id

        addon_ids = config.event_addons_map.get(event_id, set())
        event_addons = []
        for aid in addon_ids:   
            if aid not in config.add_ons_db: return

            add_ons = config.add_ons_db[aid].copy() 
            add_ons['addID'] = aid
            event_addons.append(add_ons)
                
        return event_data, event_addons
    
    def get_all_events(self) -> list[dict]:
        return list(config.events_db.values())

    def action(self, Perm:str, OP: int, ID: int, DATA: dict | int = 0) -> Action: 
        if not ID or not isinstance(ID,int): return
        if Perm != 'Admin' : return
        
        match OP:
            case 'ADD_EVENT': 
                print(f"Adding {DATA}")
                if not isinstance(DATA,dict): return
                return Events.insert_events({0 : DATA})
            case 'EDIT_EVENT': 
                if not isinstance(DATA,dict): return
                return Events.edit_event(ID,DATA)
            
            case 'DELETE_EVENT': return Events.delete_event(ID)     
            case 'UPDATE_AVAILABILITY': 
                if not isinstance(DATA,int): return
                Events.update_availability(ID,DATA)     
            case 'CACHE_EVENT': Events.cache_event(ID)
    
    def internal_actions(self, OP: str):
        match OP:  
            case 'CACHE_ALL': Events.get_event_caches()
            case 'INSERT_DEFAULTS': Events.insert_all_static()

# Init
event_manager = EventsManager()
event_class = Events
venue_class = Venues