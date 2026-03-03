import pandas as pd
import numpy as np
import io
import requests
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

def get_base_dataset():
    """
    Downloads a standard Fertilizer Recommendation dataset commonly found on Kaggle.
    If downloading fails, uses a realistic synthetic fallback dataset.
    """
    # A known GitHub repo hosting the Kaggle fertilizer dataset (NPK, Temp, Hum, Moisture, Soil, Crop -> Fertilizer)
    url = "https://raw.githubusercontent.com/Gladiator07/Fertilizer-Recommendation/master/Data/Fertilizer%20Prediction.csv"
    
    try:
        print("Downloading dataset from GitHub...")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        df = pd.read_csv(io.StringIO(response.text))
        print("Dataset downloaded successfully.")
        return df
    except Exception as e:
        print(f"Failed to download dataset: {e}. Generating fallback dataset...")
        
        # Realistic bounds for synthetic fallback (N, P, K, Temp, Hum, Moisture, Soil, Crop)
        data = []
        soils = ['Sandy', 'Loamy', 'Black', 'Red', 'Clayey']
        crops = ['Maize', 'Sugarcane', 'Cotton', 'Tobacco', 'Paddy', 'Barley', 'Wheat', 'Millets', 'Oil seeds', 'Pulses', 'Ground Nuts']
        fertilizers = ['Urea', 'DAP', '14-35-14', '28-28', '17-17-17', '20-20', '10-26-26']
        
        # Generate 500 rows of synthetic relationships based on common agronomy
        for _ in range(500):
            temp = np.random.randint(25, 38)
            hum = np.random.randint(50, 75)
            moist = np.random.randint(30, 60)
            soil = np.random.choice(soils)
            crop = np.random.choice(crops)
            
            n = np.random.randint(20, 50)
            k = np.random.randint(0, 20)
            p = np.random.randint(10, 40)
            
            # Simple rule-based generation to mimic actual Kaggle dataset distributions
            if n < 30 and soil == 'Black': fert = 'Urea'
            elif p > 30 and k < 10: fert = 'DAP'
            elif k > 15 and p < 20: fert = '14-35-14'
            elif temp > 30 and moist < 40: fert = '28-28'
            elif hum > 60 and crop in ['Paddy', 'Sugarcane']: fert = '20-20'
            else: fert = np.random.choice(fertilizers)
            
            data.append([temp, hum, moist, soil, crop, n, k, p, fert])
            
        df = pd.DataFrame(data, columns=['Temparature', 'Humidity ', 'Moisture', 'Soil Type', 'Crop Type', 'Nitrogen', 'Potassium', 'Phosphorous', 'Fertilizer Name'])
        return df

def augment_with_crop_stage(df):
    """
    Kaggle datasets typically lack 'Crop Stage'. We will synthesize this feature.
    Stages: Seedling, Vegetative, Flowering, Fruiting/Harvest
    
    Nutrient demands change per stage. We adjust NPK to make the model learn the relationship:
    - Seedling/Vegetative need more Nitrogen
    - Flowering/Fruiting need more Phosphorus and Potassium
    """
    stages = ['Seedling', 'Vegetative', 'Flowering', 'Fruiting/Harvest']
    df_augmented = []
    
    # We will expand the dataset by duplicating rows and assigning a stage, adjusting NPK slightly
    for index, row in df.iterrows():
        for stage in stages:
            new_row = row.copy()
            new_row['Crop Stage'] = stage
            
            # Adjust historical NPK to simulate stage-based needs
            if stage in ['Seedling', 'Vegetative']:
                new_row['Nitrogen'] = min(100, row['Nitrogen'] + np.random.randint(5, 15))
                # High N -> usually Urea or DAP is recommended
                if np.random.rand() > 0.5:
                    new_row['Fertilizer Name'] = 'Urea'
            elif stage in ['Flowering', 'Fruiting/Harvest']:
                new_row['Phosphorous'] = min(100, row['Phosphorous'] + np.random.randint(10, 20))
                new_row['Potassium'] = min(100, row['Potassium'] + np.random.randint(10, 20))
                # High PK -> usually complexes like 10-26-26 or 14-35-14
                if np.random.rand() > 0.5:
                    new_row['Fertilizer Name'] = '10-26-26'
                    
            df_augmented.append(new_row)
            
    return pd.DataFrame(df_augmented)
    

def train_model():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Get Data
    df = get_base_dataset()
    
    # 2. Augment Data with Crop Stage
    print("Augmenting dataset with Crop Stage feature...")
    df = augment_with_crop_stage(df)
    
    # Standardize column names (Kaggle dataset has a typo in 'Temparature' and trailing space in 'Humidity ')
    df.rename(columns={'Temparature': 'Temperature', 'Humidity ': 'Humidity'}, inplace=True)
    
    # 3. Encode Categorical Variables
    le_soil = LabelEncoder()
    le_crop = LabelEncoder()
    le_stage = LabelEncoder()
    le_fert = LabelEncoder()
    
    df['Soil_Encoded'] = le_soil.fit_transform(df['Soil Type'])
    df['Crop_Encoded'] = le_crop.fit_transform(df['Crop Type'])
    df['Stage_Encoded'] = le_stage.fit_transform(df['Crop Stage'])
    df['Fertilizer_Encoded'] = le_fert.fit_transform(df['Fertilizer Name'])
    
    # Save encoders
    joblib.dump(le_soil, os.path.join(BASE_DIR, 'le_fert_soil.pkl'))
    joblib.dump(le_crop, os.path.join(BASE_DIR, 'le_fert_crop.pkl'))
    joblib.dump(le_stage, os.path.join(BASE_DIR, 'le_fert_stage.pkl'))
    joblib.dump(le_fert, os.path.join(BASE_DIR, 'le_fert_name.pkl'))
    
    # 4. Prepare Features and Target
    # Desired feature order: Nitrogen, Phosphorous, Potassium, Temperature, Humidity, Moisture, Soil_Encoded, Crop_Encoded, Stage_Encoded
    X = df[['Nitrogen', 'Phosphorous', 'Potassium', 'Temperature', 'Humidity', 'Moisture', 'Soil_Encoded', 'Crop_Encoded', 'Stage_Encoded']]
    y = df['Fertilizer_Encoded']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 5. Train Random Forest Classifier
    print("Training Random Forest Classifier...")
    rf = RandomForestClassifier(n_estimators=100, random_state=42)
    rf.fit(X_train, y_train)
    
    # 6. Evaluate
    y_pred = rf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Model trained successfully! Accuracy: {acc*100:.2f}%")
    
    # 7. Save Model
    moel_path = os.path.join(BASE_DIR, 'fertilizer_recommendation_model.pkl')
    joblib.dump(rf, moel_path)
    print(f"Model saved to {moel_path}")
    
if __name__ == "__main__":
    train_model()
