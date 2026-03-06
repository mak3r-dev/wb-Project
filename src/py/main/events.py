# Modules
from ..imports.glo import *

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
class Events(Base):
    
    __table__ = 'events'
    eventID = Column(Int, primary_key=True, auto_increment=True)
    eventName = Column(string(54), nullable=False, unique=True)
    eventDesc = Column(string(255), default='None')
    eventPrice = Column(Int, nullable=False)
    eventStart = Column(Date, nullable=False)
    eventEnd = Column(Date, nullable=False)
    eventStatus = Column(string(27), nullable=False)
    eventOrganizers = Column(string(170), nullable=False)
    eventRating = Column(string(27), nullable=False)
    eventAvailability =  Column(Int, nullable=False)
    eventFt = Column(TinyINT, nullable=False)
    venueID = Column(Int, ForeignKey('venues.venueID','cascade','cascade'))


class EventsManager:
    __slots__ = ('VENUE_KEYS','SUITABILITY_KEYS')
    def __init__(self):
        self.VENUE_KEYS = frozenset({'venueName', 'venueCapacity', 'venueAddress'})
        self.SUITABILITY_KEYS = frozenset({'suitability'})

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
    
    def insert_events(self, event_data_list: dict[dict[int,str]]) -> None:
        if not event_data_list: return

        venue_cache: dict[str, int] = {}
        for id, entry in event_data_list.items():
            
            # Separate Venue, Suitability, and Event data
            venue_payload = {k: v for k, v in entry.items() if k in self.VENUE_KEYS}
            event_payload = {k: v for k, v in entry.items() if k not in self.VENUE_KEYS and k not in self.SUITABILITY_KEYS}

            venue_name = venue_payload.get('venueName')
            venue_id = None

            if venue_name:
                if venue_name in venue_cache:
                    venue_id = venue_cache[venue_name] # O(1) Cache hit
                else:
                    new_venue = Venues(venue_payload)
                    db.add(new_venue).on_duplicate()
                    venue_id = db.flush()
                    venue_cache[venue_name] = venue_id

            if venue_id:  event_payload['venueID'] = venue_id

            # Insert Event  
            new_event = Events(event_payload)
            db.add(new_event).on_duplicate()

            if not venue_id: return
            sui_id = config.suitability_map[entry.get('suitability')]['id']
            new_suitable = suitableVenues(venueID=venue_id, suitabilityID=sui_id)  
            db.add(new_suitable).on_duplicate() 

        db.commit()


    def insert_all_static(self) -> None:
        # 1. Insert sui... and add_ons and commit
        [db.add(suitability({'suitabilityName' : name})).on_duplicate() for name in config.suitability_map.keys()]
        [db.add(AddOns(data)).on_duplicate() for data in config.add_ons_db.values()]
        
        db.commit()

        # 2. Insert Events and its addons
        EventsManager().insert_events(config.events_db)
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

    def add_event(self, event_to_add: dict):
        cur_id = len(config.events_db)
        self.insert_events({cur_id : event_to_add})

# Init
event_manager = EventsManager()
event_class = Events
venue_class = Venues
