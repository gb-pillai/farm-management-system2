import sys
import joblib
import numpy as np
import os
import warnings

warnings.filterwarnings('ignore', category=UserWarning)

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))

    le_soil = joblib.load(os.path.join(BASE_DIR, "le_fert_soil.pkl"))
    le_crop = joblib.load(os.path.join(BASE_DIR, "le_fert_crop.pkl"))
    le_stage = joblib.load(os.path.join(BASE_DIR, "le_fert_stage.pkl"))
    le_fert = joblib.load(os.path.join(BASE_DIR, "le_fert_name.pkl"))
    model = joblib.load(os.path.join(BASE_DIR, "fertilizer_recommendation_model.pkl"))

    # Expected args: n, p, k, temp, hum, moist, soil, crop, stage
    n = float(sys.argv[1])
    p = float(sys.argv[2])
    k = float(sys.argv[3])
    temp = float(sys.argv[4])
    hum = float(sys.argv[5])
    moist = float(sys.argv[6])
    soil = sys.argv[7].strip()
    crop = sys.argv[8].strip()
    stage = sys.argv[9].strip()

    # Handle unseen labels by falling back to the most common or first class if missing
    def safe_transform(le, val, fallback=0):
        try:
            return le.transform([val])[0]
        except ValueError:
            return fallback

    soil_encoded = safe_transform(le_soil, soil)
    crop_encoded = safe_transform(le_crop, crop)
    stage_encoded = safe_transform(le_stage, stage)

    # EXACT SAME ORDER AS TRAINING
    # Feature order: ['Nitrogen', 'Phosphorous', 'Potassium', 'Temperature', 'Humidity', 'Moisture', 'Soil_Encoded', 'Crop_Encoded', 'Stage_Encoded']
    features = np.array([[n, p, k, temp, hum, moist, soil_encoded, crop_encoded, stage_encoded]])

    fert_idx = model.predict(features)[0]
    recommended_fertilizer = le_fert.inverse_transform([fert_idx])[0]

    print(recommended_fertilizer)

except Exception as e:
    print(f"ERROR: {str(e)}")
    sys.exit(1)
