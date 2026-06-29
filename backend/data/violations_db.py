"""
NYC Department of Health Restaurant Violation Database
Full list of violations used for daily checklist generation
"""

NYC_VIOLATIONS = [
    # ── FOOD TEMPERATURE (Critical) ─────────────────────────
    {
        "code": "04A",
        "title": "Hot food below 140°F",
        "description": "Hot food item not kept at or above 140°F",
        "category": "food_temperature",
        "severity": "critical",
        "max_points": 28,
        "daily_checks": [
            "Check all hot holding equipment temperature",
            "Verify soups, gravies, cooked meats are at 140°F or above",
            "Check steam table water temperature"
        ],
        "fix": "Reheat food to 165°F before hot holding. Check equipment thermostat. Log temps every 2 hours."
    },
    {
        "code": "04C",
        "title": "Cold food above 41°F",
        "description": "Cold food item not kept at or below 41°F",
        "category": "food_temperature",
        "severity": "critical",
        "max_points": 28,
        "daily_checks": [
            "Check walk-in refrigerator temperature (must be ≤41°F)",
            "Check all reach-in refrigerators",
            "Verify raw meats are at safe temperature",
            "Check cut produce and dairy temperatures"
        ],
        "fix": "Adjust thermostat. Move food to working unit immediately. Log temperatures every 2 hours."
    },
    {
        "code": "04D",
        "title": "Improper food cooling",
        "description": "Food not cooled from 140°F to 70°F within 2 hours and to 41°F within 4 more hours",
        "category": "food_temperature",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Check that cooling foods are in shallow uncovered pans",
            "Verify cooling log is being filled out",
            "Check walk-in for large covered pots that may be cooling improperly"
        ],
        "fix": "Use ice baths or blast chiller. Use shallow uncovered containers. Never cool in deep covered pots."
    },
    {
        "code": "04E",
        "title": "Inadequate cooking temperature",
        "description": "Food not cooked to required minimum internal temperature",
        "category": "food_temperature",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Verify thermometers at cook station are calibrated",
            "Post minimum cooking temps: poultry=165°F, ground meat=155°F, fish/pork=145°F",
            "Check that all line cooks know required temperatures"
        ],
        "fix": "Post cooking temperature chart at cook line. Test thermometers daily in ice water (32°F) and boiling water (212°F)."
    },
    # ── PERSONAL HYGIENE (Critical) ─────────────────────────
    {
        "code": "05B",
        "title": "Improper hand washing",
        "description": "Food worker does not wash hands thoroughly or at required times",
        "category": "personal_hygiene",
        "severity": "critical",
        "max_points": 5,
        "daily_checks": [
            "Brief all staff on handwashing at start of shift",
            "Verify soap and paper towels at ALL handwashing sinks",
            "Ensure handwashing sinks are not used for food prep or rinsing"
        ],
        "fix": "Post handwashing reminder. Require washing after raw meat handling, bathroom use, touching phone/face."
    },
    {
        "code": "05D",
        "title": "Hand washing sink not accessible",
        "description": "Handwashing facility not available, accessible, or properly equipped",
        "category": "personal_hygiene",
        "severity": "critical",
        "max_points": 5,
        "daily_checks": [
            "Check all handwashing sinks have hot AND cold running water",
            "Ensure soap dispensers are filled",
            "Verify paper towel dispensers are stocked",
            "Check sinks are not blocked by equipment or boxes"
        ],
        "fix": "Keep handwashing sinks clear at all times. Stock soap and towels at start of every shift."
    },
    {
        "code": "05E",
        "title": "Improper glove use",
        "description": "Food worker does not use or properly use single-use gloves",
        "category": "personal_hygiene",
        "severity": "critical",
        "max_points": 5,
        "daily_checks": [
            "Verify single-use gloves available at all prep stations",
            "Check that gloves are changed after handling raw meat",
            "Ensure gloves are not being washed and reused"
        ],
        "fix": "Gloves = single use only. Change when switching tasks. Stock gloves at every prep station."
    },
    {
        "code": "05H",
        "title": "Food Protection Certificate missing",
        "description": "No Food Protection Certificate holder on duty per shift",
        "category": "personal_hygiene",
        "severity": "general",
        "max_points": 5,
        "daily_checks": [
            "Verify at least one Food Protection Certificate holder is on every shift",
            "Check that certificate is posted visibly",
            "Check expiration dates on all staff certificates"
        ],
        "fix": "At least one supervisor per shift must hold valid NYC FPC. Enroll at nyc.gov/health. $24 course."
    },
    {
        "code": "05I",
        "title": "Employee illness not reported",
        "description": "Food worker with illness/symptom not excluded from food handling",
        "category": "personal_hygiene",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Ask staff at start of shift about illness symptoms",
            "Send home any staff with vomiting, diarrhea, jaundice, or open sores",
            "Post illness reporting policy in staff area"
        ],
        "fix": "Create written illness policy. Staff with vomiting or diarrhea must be excluded immediately. Document exclusions."
    },
    # ── FOOD HANDLING & STORAGE ─────────────────────────────
    {
        "code": "04H",
        "title": "Raw food cross-contamination",
        "description": "Raw animal food stored above or touching ready-to-eat food",
        "category": "food_handling",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Check walk-in storage order: (bottom→top) raw poultry → raw ground meat → raw whole beef → raw fish → ready-to-eat",
            "Verify separate cutting boards for raw meat vs vegetables (color-coded)",
            "Ensure raw meat containers are covered and not dripping"
        ],
        "fix": "Label walk-in shelves. Use color-coded cutting boards. Raw poultry always on bottom shelf."
    },
    {
        "code": "04K",
        "title": "Food from unapproved source",
        "description": "Food not from a licensed source or improperly identified",
        "category": "food_handling",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Verify all active suppliers are licensed (check their permits)",
            "Check that all deliveries come with invoices",
            "Inspect incoming deliveries: proper temperature, sealed packaging"
        ],
        "fix": "Only purchase from licensed suppliers. Keep delivery invoices on file for 90 days. Never accept from unlicensed vendors."
    },
    {
        "code": "04L",
        "title": "Food not labeled or dated",
        "description": "Prepared or prepackaged food not labeled with name and prep/use-by date",
        "category": "food_handling",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Walk through walk-in: check every container has a label with name + prep date",
            "Remove and discard any items past their use-by date",
            "Verify date labeling supplies are stocked at prep stations"
        ],
        "fix": "Rule: if it goes in a container, it gets a label. Use pre-printed date labels. Check daily."
    },
    {
        "code": "04N",
        "title": "Food not protected from contamination",
        "description": "Food stored uncovered, on floor, or exposed to contamination",
        "category": "food_handling",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Check all stored food is covered with lids or wrap",
            "Verify no food is stored on the floor (minimum 6 inches off floor)",
            "Inspect food near chemicals, cleaning supplies, or garbage"
        ],
        "fix": "Cover all stored food. Use shelving. Never store food on floor. Check walk-in daily."
    },
    # ── FACILITY & EQUIPMENT ────────────────────────────────
    {
        "code": "06C",
        "title": "Food contact surface not sanitized",
        "description": "Food contact surfaces not properly washed, rinsed, and sanitized",
        "category": "facility",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Set up 3-compartment sink: wash (hot soapy) → rinse (clean water) → sanitize",
            "Test sanitizer concentration with test strips: chlorine 50-100ppm OR quat 200ppm",
            "Verify cutting boards and prep surfaces sanitized between uses",
            "Change sanitizer solution every 4 hours"
        ],
        "fix": "Set up 3-compartment sink at start of every shift. Keep test strips accessible. Change solution every 4 hours."
    },
    {
        "code": "06D",
        "title": "Non-food contact surfaces dirty",
        "description": "Non-food contact surface not properly maintained or cleaned",
        "category": "facility",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Clean under and behind equipment (fryers, walk-in, ovens)",
            "Wipe down equipment exteriors, handles, knobs, door gaskets",
            "Check walls, floors, and ceiling for grease or debris buildup"
        ],
        "fix": "Assign daily cleaning zones to staff. Deep clean under equipment weekly. Log cleaning tasks."
    },
    {
        "code": "06E",
        "title": "Improper equipment or utensils",
        "description": "Equipment or utensils not designed for food use; improper material",
        "category": "facility",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Check equipment is NSF-certified or food-grade",
            "Inspect cutting boards for deep grooves (replace if grooved — bacteria harbors there)",
            "Verify no cracked or damaged food containers in use"
        ],
        "fix": "Replace worn cutting boards. Only use food-grade equipment. Discard cracked containers."
    },
    # ── PEST CONTROL (Critical) ─────────────────────────────
    {
        "code": "08A",
        "title": "Evidence of mice or rats",
        "description": "Active rodent infestation: droppings, gnaw marks, burrows, or live rodents",
        "category": "pest_control",
        "severity": "critical",
        "max_points": 28,
        "daily_checks": [
            "Inspect behind equipment and in corners for rodent droppings",
            "Check storage areas and under sinks for gnaw marks or nesting material",
            "Verify all food stored in sealed hard-sided containers (not cardboard)",
            "Check entry points: gaps around pipes, doors, windows"
        ],
        "fix": "Seal all gaps. Store all food in sealed containers off the floor. Schedule licensed PCO monthly. Keep PCO log."
    },
    {
        "code": "08B",
        "title": "Evidence of cockroaches",
        "description": "Active cockroach infestation: live roaches, egg cases, or cast skins",
        "category": "pest_control",
        "severity": "critical",
        "max_points": 28,
        "daily_checks": [
            "Inspect dark corners and under equipment for cockroach activity",
            "Break down and dispose of cardboard boxes immediately upon delivery",
            "Check floor drains for cockroach harborage",
            "Verify no standing water or moisture under equipment"
        ],
        "fix": "Never keep cardboard in kitchen. Fix leaking pipes. Use licensed PCO (not retail pesticides). Inspect monthly."
    },
    {
        "code": "08C",
        "title": "Evidence of flies or other pests",
        "description": "Filth flies, fruit flies, or other pests present",
        "category": "pest_control",
        "severity": "general",
        "max_points": 7,
        "daily_checks": [
            "Check that all exterior doors and windows have proper screens",
            "Verify garbage bins are covered and not overflowing",
            "Clean floor drains to eliminate fly breeding sites",
            "Check fruit/vegetable storage for fruit flies"
        ],
        "fix": "Use UV fly traps. Keep doors closed. Empty and clean trash bins multiple times daily. Clean drains weekly with drain cleaner."
    },
    # ── PLUMBING ────────────────────────────────────────────
    {
        "code": "10B",
        "title": "Plumbing not maintained",
        "description": "Plumbing not properly maintained; leaks; no hot water; backflow issues",
        "category": "plumbing",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Check for dripping faucets or leaking pipes under sinks",
            "Verify hot water is available at all handwashing and dishwashing sinks",
            "Inspect grease trap (check for overflow or odor)",
            "Verify floor drains are clear and draining properly"
        ],
        "fix": "Report all leaks to maintenance immediately. Hot water must be at least 100°F at handwashing sinks, 120°F at dishwashing."
    },
    {
        "code": "10F",
        "title": "Toilet facility not maintained",
        "description": "Toilet facility not kept clean; not stocked with required supplies",
        "category": "facility",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Check bathroom has toilet paper, soap, and paper towels",
            "Verify self-closing bathroom door functions properly",
            "Check bathroom cleanliness and odor",
            "Ensure NO FOOD/DRINKS in bathroom"
        ],
        "fix": "Assign bathroom check to opening staff. Stock supplies at start of day. Self-closing door required by law."
    },
    # ── CHEMICAL STORAGE ────────────────────────────────────
    {
        "code": "09B",
        "title": "Toxic chemicals improperly stored",
        "description": "Cleaning chemicals stored near food, above food, or on food contact surfaces",
        "category": "chemicals",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Verify all cleaning chemicals are in a SEPARATE cabinet from food",
            "Check that chemical containers are properly labeled",
            "Ensure chemicals are stored BELOW food and food contact surfaces",
            "Verify spray bottles are labeled with product name"
        ],
        "fix": "Dedicate one locked cabinet for chemicals only. Label all spray bottles. Never store chemicals near food storage."
    },
    {
        "code": "09C",
        "title": "Improper pesticide use",
        "description": "Pesticide or rodenticide improperly applied or used without a license",
        "category": "chemicals",
        "severity": "critical",
        "max_points": 7,
        "daily_checks": [
            "Verify only licensed pest control operators apply pesticides",
            "Check pesticide application log is current",
            "Ensure no retail-grade pesticide products in kitchen"
        ],
        "fix": "Only use licensed pest control operators (PCOs). Keep PCO log with dates, operator name, license number, product used."
    },
    # ── ADMINISTRATIVE ───────────────────────────────────────
    {
        "code": "15B",
        "title": "Operating without valid permit",
        "description": "Food service establishment operating without a valid DOH permit",
        "category": "administrative",
        "severity": "general",
        "max_points": 5,
        "daily_checks": [
            "Verify DOH operating permit is posted near the entrance (visible to public)",
            "Check permit expiration date",
            "Ensure all required licenses are current and displayed"
        ],
        "fix": "Post DOH permit, Food Protection Certificate, and applicable liquor license in visible location. Renew before expiration."
    },
    {
        "code": "15H",
        "title": "Recycling non-compliance",
        "description": "Recyclable materials not properly sorted or stored",
        "category": "administrative",
        "severity": "general",
        "max_points": 2,
        "daily_checks": [
            "Check that recyclables (glass, metal, plastic, cardboard) are separated from trash",
            "Verify recycling bins are labeled",
            "Ensure cardboard is broken down and stored properly"
        ],
        "fix": "Label separate bins for recyclables. Break down cardboard. NYC requires restaurant recycling compliance."
    },
]

# Category display names
CATEGORIES = {
    "food_temperature": {"label": "🌡️ Food Temperature", "color": "#EF4444"},
    "personal_hygiene": {"label": "🧼 Personal Hygiene", "color": "#F59E0B"},
    "food_handling":    {"label": "🥩 Food Handling & Storage", "color": "#D97706"},
    "facility":         {"label": "🏗️ Facility & Equipment", "color": "#6366F1"},
    "pest_control":     {"label": "🐀 Pest Control", "color": "#DC2626"},
    "plumbing":         {"label": "🚰 Plumbing", "color": "#0EA5E9"},
    "chemicals":        {"label": "⚗️ Chemical Storage", "color": "#8B5CF6"},
    "administrative":   {"label": "📋 Administrative", "color": "#6B7280"},
}

# High-risk violations by cuisine type (top 5 based on NYC DOH data)
CUISINE_RISK_PROFILES = {
    "italian":   ["04A", "04C", "04H", "08A", "06C"],
    "chinese":   ["04A", "04C", "04H", "08A", "08B"],
    "mexican":   ["04A", "04C", "04H", "04L", "08A"],
    "american":  ["04A", "04C", "04E", "08A", "06C"],
    "seafood":   ["04C", "04H", "04K", "04E", "05B"],
    "bakery":    ["04L", "08B", "06C", "05H", "09B"],
    "cafe":      ["04C", "05B", "06C", "04L", "08B"],
    "indian":    ["04A", "04C", "04H", "08A", "04L"],
    "japanese":  ["04C", "04H", "04K", "04E", "05B"],
    "pizza":     ["04A", "04C", "04H", "08A", "06D"],
    "deli":      ["04C", "04H", "04L", "05B", "08A"],
    "default":   ["04A", "04C", "04H", "08A", "05B", "06C"],
}

# Temperature safety ranges
TEMP_SAFETY = {
    "walk_in_fridge":  {"min": None, "max": 41.0, "label": "Walk-in Refrigerator"},
    "reach_in_fridge": {"min": None, "max": 41.0, "label": "Reach-in Refrigerator"},
    "freezer":         {"min": None, "max": 0.0,  "label": "Freezer"},
    "hot_holding":     {"min": 140.0, "max": None, "label": "Hot Holding"},
    "raw_poultry":     {"min": None, "max": 41.0, "label": "Raw Poultry Storage"},
    "raw_beef":        {"min": None, "max": 41.0, "label": "Raw Beef Storage"},
    "fish":            {"min": None, "max": 41.0, "label": "Fish Storage"},
    "cooked_chicken":  {"min": 165.0, "max": None, "label": "Cooked Chicken (min cook temp)"},
    "cooked_beef":     {"min": 155.0, "max": None, "label": "Ground Beef (min cook temp)"},
    "cooked_fish":     {"min": 145.0, "max": None, "label": "Fish (min cook temp)"},
}


def get_checklist(cuisine_type: str = "default") -> list:
    """Return all violations as checklist items for a given cuisine."""
    return NYC_VIOLATIONS


def get_risk_codes(cuisine_type: str) -> list:
    """Return top 5 risk violation codes for a cuisine type."""
    key = cuisine_type.lower() if cuisine_type.lower() in CUISINE_RISK_PROFILES else "default"
    return CUISINE_RISK_PROFILES[key]


def get_violation_by_code(code: str) -> dict:
    for v in NYC_VIOLATIONS:
        if v["code"] == code:
            return v
    return {}
