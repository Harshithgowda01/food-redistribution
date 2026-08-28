import math
from datetime import datetime


def haversine_distance(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two GPS points"""
    R = 6371  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def calculate_distance_score(distance_km, max_radius=15):
    """Closer NGOs get higher score. Beyond max_radius km = 0 score"""
    if distance_km >= max_radius:
        return 0
    return round((1 - (distance_km / max_radius)) * 100, 2)


def calculate_compatibility_score(food_type, ngo_preferences):
    """How well the food type matches what NGO accepts"""
    if not ngo_preferences:
        return 50
    if 'any' in ngo_preferences:
        return 100
    if food_type in ngo_preferences:
        return 100
    return 20


def calculate_capacity_score(quantity, capacity):
    """Can the NGO handle this quantity of food"""
    if capacity <= 0:
        return 0
    if capacity >= quantity:
        ratio = quantity / capacity
        return round(60 + (ratio * 40), 2)  # 60-100 range
    else:
        ratio = capacity / quantity
        return round(ratio * 50, 2)  # max 50 if under capacity


def calculate_urgency_score(expiry_time_str):
    """How urgent is this donation based on time left before expiry"""
    try:
        expiry = datetime.fromisoformat(expiry_time_str.replace('Z', '+00:00'))
        now = datetime.now(expiry.tzinfo) if expiry.tzinfo else datetime.now()
        hours_left = (expiry - now).total_seconds() / 3600

        if hours_left <= 0:
            return 0
        if hours_left <= 1:
            return 100
        if hours_left <= 3:
            return 80
        if hours_left <= 6:
            return 60
        if hours_left <= 12:
            return 40
        return 20
    except Exception:
        return 50


def calculate_availability_score(is_available):
    return 100 if is_available else 0


def match_ngos(donation, ngos):
    """
    Main matching function.
    Takes donation details and list of NGOs, returns ranked list.
    """
    results = []

    urgency_score = calculate_urgency_score(donation['expiryTime'])

    # If food is very urgent, distance matters even more
    if urgency_score >= 80:
        weights = {'distance': 0.45, 'compatibility': 0.20, 'capacity': 0.15, 'availability': 0.10, 'urgency': 0.10}
    else:
        weights = {'distance': 0.30, 'compatibility': 0.25, 'capacity': 0.20, 'availability': 0.15, 'urgency': 0.10}

    for ngo in ngos:
        if not ngo.get('isAvailable', True):
            continue

        distance_km = haversine_distance(
            donation['latitude'], donation['longitude'],
            ngo['latitude'], ngo['longitude']
        )

        distance_score = calculate_distance_score(distance_km)
        compatibility_score = calculate_compatibility_score(donation['foodType'], ngo.get('foodPreferences', []))
        capacity_score = calculate_capacity_score(donation['quantity'], ngo.get('capacity', 0))
        availability_score = calculate_availability_score(ngo.get('isAvailable', True))

        total_score = (
            distance_score * weights['distance'] +
            compatibility_score * weights['compatibility'] +
            capacity_score * weights['capacity'] +
            availability_score * weights['availability'] +
            urgency_score * weights['urgency']
        )

        results.append({
            'ngoId': ngo['ngoId'],
            'ngoProfileId': ngo['ngoProfileId'],
            'name': ngo['name'],
            'distanceKm': round(distance_km, 2),
            'distanceScore': distance_score,
            'compatibilityScore': compatibility_score,
            'capacityScore': capacity_score,
            'urgencyScore': urgency_score,
            'availabilityScore': availability_score,
            'totalScore': round(total_score, 2)
        })

    results.sort(key=lambda x: x['totalScore'], reverse=True)

    return results