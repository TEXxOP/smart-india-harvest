import joblib
import json

def get_info(path):
    print("Loading", path)
    model = joblib.load(path)
    res = {"type": str(type(model))}
    if hasattr(model, 'n_features_in_'):
        res["n_features_in_"] = model.n_features_in_
    if hasattr(model, 'feature_names_in_'):
        res["feature_names_in_"] = list(model.feature_names_in_)
    return res

out = {
    "random_forest": get_info("c:/Users/haris/Documents/smart-india-harvest/backend/RandomForest.pkl"),
    "crop_yield": get_info("c:/Users/haris/Documents/smart-india-harvest/backend/crop_yield_model.pkl")
}

with open("c:/Users/haris/Documents/smart-india-harvest/backend/model_info.json", "w") as f:
    json.dump(out, f, indent=2)
