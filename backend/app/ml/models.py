"""
ML Models for Caterpillar Dealer Asset Management Platform.

Includes:
1. Demand Forecasting (Time-series prediction)
2. Predictive Maintenance (Equipment failure prediction)
3. Dynamic Pricing Engine
4. Anomaly Detection
5. Job-Fit Recommender
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
from sklearn.ensemble import (
    RandomForestRegressor, RandomForestClassifier, 
    GradientBoostingRegressor, IsolationForest
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_absolute_error, f1_score, mean_squared_error
import joblib
import os
import json
from typing import Dict, List, Optional, Tuple
import warnings
warnings.filterwarnings("ignore")


MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "models"))
DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "synthetic"))


# ═══════════════════════════════════════════════════════════
# 1. DEMAND FORECASTING MODEL
# ═══════════════════════════════════════════════════════════

class DemandForecaster:
    """
    Predicts future rental demand by equipment category and region.
    Uses gradient boosting with temporal and seasonal features.
    """
    
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        self.metrics = {}
    
    def _create_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Engineer temporal and categorical features."""
        features = pd.DataFrame()
        
        # Temporal features
        features["day_of_week"] = df["date"].dt.dayofweek
        features["month"] = df["date"].dt.month
        features["quarter"] = df["date"].dt.quarter
        features["day_of_year"] = df["date"].dt.dayofyear
        features["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
        features["is_weekend"] = (df["date"].dt.dayofweek >= 5).astype(int)
        
        # Seasonal features (cyclical encoding)
        features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
        features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
        features["day_sin"] = np.sin(2 * np.pi * features["day_of_week"] / 7)
        features["day_cos"] = np.cos(2 * np.pi * features["day_of_week"] / 7)
        
        # Category encoding
        for col in ["category", "region"]:
            if col in df.columns:
                if col not in self.label_encoders:
                    self.label_encoders[col] = LabelEncoder()
                    features[col + "_encoded"] = self.label_encoders[col].fit_transform(df[col])
                else:
                    features[col + "_encoded"] = self.label_encoders[col].transform(df[col])
        
        # Lag features (if available)
        if "demand_lag_7" in df.columns:
            features["demand_lag_7"] = df["demand_lag_7"]
            features["demand_lag_30"] = df["demand_lag_30"]
            features["demand_rolling_mean_7"] = df["demand_rolling_mean_7"]
        
        return features
    
    def prepare_training_data(self, rentals_df: pd.DataFrame, equipment_df: pd.DataFrame) -> Tuple:
        """Prepare demand aggregation from rental history."""
        # Merge to get category info
        merged = rentals_df.merge(
            equipment_df[["id", "category"]].rename(columns={"id": "equipment_id"}),
            on="equipment_id", how="left"
        )
        merged["start_date"] = pd.to_datetime(merged["start_date"])
        
        # Create a dealer region mapping
        merged["region"] = np.random.choice(
            ["North", "South", "East", "West", "Central"], 
            size=len(merged)
        )
        
        # Aggregate daily demand by category and region
        demand = merged.groupby([
            merged["start_date"].dt.date, "category", "region"
        ]).size().reset_index(name="demand")
        demand.columns = ["date", "category", "region", "demand"]
        demand["date"] = pd.to_datetime(demand["date"])
        demand = demand.sort_values("date")
        
        # Add lag features
        for group_cols in [["category", "region"]]:
            grouped = demand.groupby(group_cols)["demand"]
            demand["demand_lag_7"] = grouped.shift(7).fillna(0)
            demand["demand_lag_30"] = grouped.shift(30).fillna(0)
            demand["demand_rolling_mean_7"] = grouped.transform(
                lambda x: x.rolling(7, min_periods=1).mean()
            )
        
        return demand
    
    def train(self, rentals_df: pd.DataFrame, equipment_df: pd.DataFrame):
        """Train the demand forecasting model."""
        print("Training Demand Forecasting Model...")
        
        demand_data = self.prepare_training_data(rentals_df, equipment_df)
        features = self._create_features(demand_data)
        target = demand_data["demand"].values
        
        X_train, X_test, y_train, y_test = train_test_split(
            features, target, test_size=0.2, shuffle=False
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        predictions = self.model.predict(X_test_scaled)
        self.metrics = {
            "mae": round(mean_absolute_error(y_test, predictions), 3),
            "rmse": round(np.sqrt(mean_squared_error(y_test, predictions)), 3),
        }
        
        self.is_trained = True
        print(f"  ✓ Trained | MAE: {self.metrics['mae']} | RMSE: {self.metrics['rmse']}")
        
        return self.metrics
    
    def predict(self, category: str, region: str, days_ahead: int = 30) -> List[Dict]:
        """Forecast demand for next N days."""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        forecasts = []
        base_date = datetime.now()
        
        for i in range(days_ahead):
            future_date = base_date + timedelta(days=i)
            
            df = pd.DataFrame([{
                "date": future_date,
                "category": category,
                "region": region,
                "demand_lag_7": np.random.uniform(2, 8),
                "demand_lag_30": np.random.uniform(3, 10),
                "demand_rolling_mean_7": np.random.uniform(3, 7),
            }])
            
            features = self._create_features(df)
            scaled = self.scaler.transform(features)
            pred = max(0, self.model.predict(scaled)[0])
            
            # Confidence interval
            std = pred * 0.2
            forecasts.append({
                "date": future_date.strftime("%Y-%m-%d"),
                "category": category,
                "region": region,
                "predicted_demand": round(pred, 1),
                "confidence_lower": round(max(0, pred - 1.96 * std), 1),
                "confidence_upper": round(pred + 1.96 * std, 1),
                "trend": "increasing" if i > 0 and pred > forecasts[-1]["predicted_demand"] else "stable",
            })
        
        return forecasts
    
    def save(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "demand_forecaster")
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.model, os.path.join(path, "model.joblib"))
        joblib.dump(self.scaler, os.path.join(path, "scaler.joblib"))
        joblib.dump(self.label_encoders, os.path.join(path, "encoders.joblib"))
        with open(os.path.join(path, "metrics.json"), "w") as f:
            json.dump(self.metrics, f)
        print(f"  ✓ Model saved to {path}")
    
    def load(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "demand_forecaster")
        self.model = joblib.load(os.path.join(path, "model.joblib"))
        self.scaler = joblib.load(os.path.join(path, "scaler.joblib"))
        self.label_encoders = joblib.load(os.path.join(path, "encoders.joblib"))
        self.is_trained = True


# ═══════════════════════════════════════════════════════════
# 2. PREDICTIVE MAINTENANCE MODEL
# ═══════════════════════════════════════════════════════════

class PredictiveMaintenanceModel:
    """
    Predicts equipment failure probability and days-to-failure.
    Uses Random Forest with sensor data and operational history.
    """
    
    def __init__(self):
        self.classifier = RandomForestClassifier(
            n_estimators=150,
            max_depth=10,
            class_weight="balanced",
            random_state=42
        )
        self.regressor = RandomForestRegressor(
            n_estimators=150,
            max_depth=10,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.metrics = {}
        self.feature_importance = {}
    
    def _engineer_features(self, daily_logs_df: pd.DataFrame, equipment_df: pd.DataFrame) -> pd.DataFrame:
        """Create predictive features from operational data."""
        # Aggregate per equipment
        agg = daily_logs_df.groupby("equipment_id").agg({
            "operating_hours": ["mean", "std", "sum"],
            "idle_hours": ["mean", "sum"],
            "fuel_consumed_liters": ["mean", "sum"],
            "avg_engine_temp": ["mean", "max", "std"],
            "avg_hydraulic_pressure": ["mean", "min", "std"],
            "avg_battery_voltage": ["mean", "min"],
            "error_code_count": ["sum", "max"],
            "operator_efficiency_score": ["mean"],
        }).reset_index()
        
        # Flatten column names
        agg.columns = ["_".join(col).strip("_") for col in agg.columns]
        agg = agg.rename(columns={"equipment_id_": "equipment_id"})
        
        # Merge with equipment data
        merged = agg.merge(
            equipment_df[["id", "health_score", "total_operating_hours", "year_manufactured", "category"]],
            left_on="equipment_id", right_on="id", how="left"
        )
        
        # Derived features
        merged["age_years"] = datetime.now().year - merged["year_manufactured"].fillna(2020)
        merged["utilization_rate"] = merged["operating_hours_sum"] / (
            merged["operating_hours_sum"] + merged["idle_hours_sum"] + 1
        )
        merged["error_rate"] = merged["error_code_count_sum"] / (merged["operating_hours_sum"] + 1)
        merged["temp_volatility"] = merged["avg_engine_temp_std"].fillna(0)
        merged["pressure_drop"] = (merged["avg_hydraulic_pressure_mean"] - merged["avg_hydraulic_pressure_min"]).fillna(0)
        merged["voltage_degradation"] = (12.6 - merged["avg_battery_voltage_mean"]).fillna(0)
        
        return merged
    
    def _create_labels(self, features_df: pd.DataFrame) -> Tuple:
        """Create binary failure labels and days-to-failure based on health score."""
        # Failure = health_score < 40
        failure_threshold = 40
        features_df["will_fail"] = (features_df["health_score"] < failure_threshold).astype(int)
        
        # Days to failure estimation (inverse of health degradation)
        features_df["days_to_failure"] = np.clip(
            features_df["health_score"] * np.random.uniform(0.8, 1.5, size=len(features_df)),
            1, 365
        ).astype(int)
        
        return features_df
    
    def train(self, daily_logs_df: pd.DataFrame, equipment_df: pd.DataFrame):
        """Train both classifier and regressor."""
        print("Training Predictive Maintenance Model...")
        
        features_df = self._engineer_features(daily_logs_df, equipment_df)
        features_df = self._create_labels(features_df)
        
        feature_cols = [
            "operating_hours_mean", "operating_hours_std", "idle_hours_mean",
            "fuel_consumed_liters_mean", "avg_engine_temp_mean", "avg_engine_temp_max",
            "avg_engine_temp_std", "avg_hydraulic_pressure_mean", "avg_hydraulic_pressure_min",
            "avg_battery_voltage_mean", "avg_battery_voltage_min",
            "error_code_count_sum", "error_code_count_max",
            "age_years", "utilization_rate", "error_rate",
            "temp_volatility", "pressure_drop", "voltage_degradation",
            "total_operating_hours",
        ]
        
        # Keep only columns that exist
        available_cols = [c for c in feature_cols if c in features_df.columns]
        X = features_df[available_cols].fillna(0)
        y_class = features_df["will_fail"]
        y_reg = features_df["days_to_failure"]
        
        X_train, X_test, y_c_train, y_c_test, y_r_train, y_r_test = train_test_split(
            X, y_class, y_reg, test_size=0.2, random_state=42
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Train classifier
        self.classifier.fit(X_train_scaled, y_c_train)
        y_c_pred = self.classifier.predict(X_test_scaled)
        
        # Train regressor
        self.regressor.fit(X_train_scaled, y_r_train)
        y_r_pred = self.regressor.predict(X_test_scaled)
        
        self.metrics = {
            "failure_f1": round(f1_score(y_c_test, y_c_pred, zero_division=0), 3),
            "days_mae": round(mean_absolute_error(y_r_test, y_r_pred), 1),
        }
        
        # Feature importance
        self.feature_importance = dict(zip(
            available_cols,
            [round(x, 4) for x in self.classifier.feature_importances_]
        ))
        self.feature_cols = available_cols
        self.is_trained = True
        
        print(f"  ✓ Trained | F1: {self.metrics['failure_f1']} | Days MAE: {self.metrics['days_mae']}")
        return self.metrics
    
    def predict(self, equipment_data: Dict) -> Dict:
        """Predict failure probability and days to failure for single equipment."""
        if not self.is_trained:
            raise ValueError("Model not trained yet")
        
        features = pd.DataFrame([equipment_data])[self.feature_cols].fillna(0)
        scaled = self.scaler.transform(features)
        
        failure_prob = self.classifier.predict_proba(scaled)[0][1]
        days_to_failure = max(1, int(self.regressor.predict(scaled)[0]))
        
        # Risk level
        if failure_prob > 0.8:
            risk = "critical"
            action = "Schedule emergency maintenance immediately"
        elif failure_prob > 0.5:
            risk = "high"
            action = "Plan maintenance within next 7 days"
        elif failure_prob > 0.3:
            risk = "medium"
            action = "Monitor closely, schedule maintenance within 30 days"
        else:
            risk = "low"
            action = "No immediate action required"
        
        # Component health from feature importance
        component_health = {}
        if equipment_data.get("avg_engine_temp_mean", 85) > 95:
            component_health["engine"] = "degraded"
        else:
            component_health["engine"] = "healthy"
        
        if equipment_data.get("avg_hydraulic_pressure_mean", 3000) < 2500:
            component_health["hydraulics"] = "degraded"
        else:
            component_health["hydraulics"] = "healthy"
        
        if equipment_data.get("avg_battery_voltage_mean", 12.6) < 11.5:
            component_health["electrical"] = "degraded"
        else:
            component_health["electrical"] = "healthy"
        
        return {
            "failure_probability": round(failure_prob, 3),
            "predicted_days_to_failure": days_to_failure,
            "risk_level": risk,
            "recommended_action": action,
            "component_health": component_health,
            "top_risk_factors": dict(sorted(
                self.feature_importance.items(), key=lambda x: x[1], reverse=True
            )[:5]),
        }
    
    def save(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "predictive_maintenance")
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.classifier, os.path.join(path, "classifier.joblib"))
        joblib.dump(self.regressor, os.path.join(path, "regressor.joblib"))
        joblib.dump(self.scaler, os.path.join(path, "scaler.joblib"))
        joblib.dump(self.feature_cols, os.path.join(path, "feature_cols.joblib"))
        with open(os.path.join(path, "metrics.json"), "w") as f:
            json.dump(self.metrics, f)
        print(f"  ✓ Model saved to {path}")
    
    def load(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "predictive_maintenance")
        self.classifier = joblib.load(os.path.join(path, "classifier.joblib"))
        self.regressor = joblib.load(os.path.join(path, "regressor.joblib"))
        self.scaler = joblib.load(os.path.join(path, "scaler.joblib"))
        self.feature_cols = joblib.load(os.path.join(path, "feature_cols.joblib"))
        self.is_trained = True


# ═══════════════════════════════════════════════════════════
# 3. DYNAMIC PRICING ENGINE
# ═══════════════════════════════════════════════════════════

class DynamicPricingEngine:
    """
    Optimizes rental pricing based on demand, supply, and market conditions.
    Uses gradient boosting to predict optimal price multiplier.
    """
    
    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
    
    def train(self, rentals_df: pd.DataFrame, equipment_df: pd.DataFrame):
        """Train pricing model from historical rental data."""
        print("Training Dynamic Pricing Engine...")
        
        merged = rentals_df.merge(
            equipment_df[["id", "category", "daily_rate", "health_score"]].rename(
                columns={"id": "equipment_id", "daily_rate": "base_rate"}
            ),
            on="equipment_id", how="left"
        )
        merged["start_date"] = pd.to_datetime(merged["start_date"])
        
        # Features
        features = pd.DataFrame()
        features["month"] = merged["start_date"].dt.month
        features["day_of_week"] = merged["start_date"].dt.dayofweek
        features["month_sin"] = np.sin(2 * np.pi * features["month"] / 12)
        features["month_cos"] = np.cos(2 * np.pi * features["month"] / 12)
        features["base_rate"] = merged["base_rate"].fillna(1000)
        features["health_score"] = merged["health_score"].fillna(80)
        
        # Category encoding
        cat_encoder = LabelEncoder()
        features["category_encoded"] = cat_encoder.fit_transform(merged["category"].fillna("Unknown"))
        
        # Demand proxy: count of rentals in same category/month
        demand_proxy = merged.groupby([
            merged["start_date"].dt.to_period("M"), "category"
        ]).size().reset_index(name="demand_count")
        
        # Target: price multiplier (actual rate / base rate)
        target = (merged["daily_rate"] / merged["base_rate"].replace(0, 1)).clip(0.5, 2.0)
        
        X = features.fillna(0)
        y = target.fillna(1.0)
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model.fit(X_train_scaled, y_train)
        
        preds = self.model.predict(X_test_scaled)
        mae = mean_absolute_error(y_test, preds)
        
        self.is_trained = True
        print(f"  ✓ Trained | Price Multiplier MAE: {mae:.3f}")
        
        return {"mae": round(mae, 3)}
    
    def get_optimal_price(self, base_rate: float, category: str, health_score: float,
                          target_date: datetime = None) -> Dict:
        """Calculate optimal rental price."""
        if not self.is_trained:
            # Fallback rule-based pricing
            return self._rule_based_pricing(base_rate, category, target_date)
        
        target_date = target_date or datetime.now()
        
        features = pd.DataFrame([{
            "month": target_date.month,
            "day_of_week": target_date.weekday(),
            "month_sin": np.sin(2 * np.pi * target_date.month / 12),
            "month_cos": np.cos(2 * np.pi * target_date.month / 12),
            "base_rate": base_rate,
            "health_score": health_score,
            "category_encoded": hash(category) % 8,
        }])
        
        scaled = self.scaler.transform(features)
        multiplier = np.clip(self.model.predict(scaled)[0], 0.7, 1.5)
        optimal_rate = round(base_rate * multiplier, 2)
        
        # Demand level
        if multiplier > 1.2:
            demand = "high"
        elif multiplier < 0.9:
            demand = "low"
        else:
            demand = "medium"
        
        return {
            "current_rate": base_rate,
            "recommended_rate": optimal_rate,
            "multiplier": round(multiplier, 3),
            "change_percentage": round((multiplier - 1) * 100, 1),
            "demand_level": demand,
            "reason": f"Based on seasonal demand ({demand}), equipment health ({health_score}%), and market analysis",
        }
    
    def _rule_based_pricing(self, base_rate, category, target_date=None):
        """Fallback rule-based pricing when model isn't trained."""
        target_date = target_date or datetime.now()
        
        # Peak season multiplier (Apr-Sep)
        if target_date.month in [4, 5, 6, 7, 8, 9]:
            seasonal = 1.15
        else:
            seasonal = 0.9
        
        # Weekend discount
        if target_date.weekday() >= 5:
            weekend = 0.95
        else:
            weekend = 1.0
        
        multiplier = seasonal * weekend
        optimal = round(base_rate * multiplier, 2)
        
        return {
            "current_rate": base_rate,
            "recommended_rate": optimal,
            "multiplier": round(multiplier, 3),
            "change_percentage": round((multiplier - 1) * 100, 1),
            "demand_level": "high" if seasonal > 1 else "low",
            "reason": "Rule-based pricing (model not yet trained)",
        }
    
    def save(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "dynamic_pricing")
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.model, os.path.join(path, "model.joblib"))
        joblib.dump(self.scaler, os.path.join(path, "scaler.joblib"))
        print(f"  ✓ Model saved to {path}")
    
    def load(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "dynamic_pricing")
        self.model = joblib.load(os.path.join(path, "model.joblib"))
        self.scaler = joblib.load(os.path.join(path, "scaler.joblib"))
        self.is_trained = True


# ═══════════════════════════════════════════════════════════
# 4. ANOMALY DETECTION MODEL
# ═══════════════════════════════════════════════════════════

class AnomalyDetector:
    """
    Detects anomalous sensor readings using Isolation Forest.
    Real-time anomaly scoring for IoT data streams.
    """
    
    def __init__(self):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            max_samples="auto",
            random_state=42
        )
        self.scaler = StandardScaler()
        self.is_trained = False
        self.feature_cols = [
            "engine_temp", "hydraulic_pressure", "battery_voltage",
            "fuel_level", "rpm", "vibration_level", "oil_pressure",
            "coolant_temp", "speed_kmh"
        ]
    
    def train(self, sensor_df: pd.DataFrame):
        """Train anomaly detection on historical sensor data."""
        print("Training Anomaly Detection Model...")
        
        X = sensor_df[self.feature_cols].fillna(0)
        X_scaled = self.scaler.fit_transform(X)
        
        self.model.fit(X_scaled)
        
        scores = self.model.score_samples(X_scaled)
        predictions = self.model.predict(X_scaled)
        anomaly_rate = (predictions == -1).mean()
        
        self.is_trained = True
        print(f"  ✓ Trained | Anomaly Rate: {anomaly_rate:.1%}")
        
        return {"anomaly_rate": round(anomaly_rate, 3)}
    
    def detect(self, reading: Dict) -> Dict:
        """Score a single sensor reading for anomalies."""
        if not self.is_trained:
            return {"is_anomaly": False, "anomaly_score": 0.0, "affected_components": []}
        
        features = pd.DataFrame([{col: reading.get(col, 0) for col in self.feature_cols}])
        scaled = self.scaler.transform(features)
        
        score = self.model.score_samples(scaled)[0]
        prediction = self.model.predict(scaled)[0]
        is_anomaly = prediction == -1
        
        # Identify affected components
        affected = []
        if reading.get("engine_temp", 85) > 100:
            affected.append("engine")
        if reading.get("hydraulic_pressure", 3000) < 2200:
            affected.append("hydraulic_system")
        if reading.get("battery_voltage", 12.6) < 11.0:
            affected.append("electrical")
        if reading.get("vibration_level", 2.5) > 5.0:
            affected.append("mechanical")
        if reading.get("oil_pressure", 45) < 25:
            affected.append("lubrication")
        
        return {
            "is_anomaly": bool(is_anomaly),
            "anomaly_score": round(abs(score), 3),
            "affected_components": affected,
            "severity": "critical" if abs(score) > 0.5 else "warning" if is_anomaly else "normal",
        }
    
    def save(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "anomaly_detector")
        os.makedirs(path, exist_ok=True)
        joblib.dump(self.model, os.path.join(path, "model.joblib"))
        joblib.dump(self.scaler, os.path.join(path, "scaler.joblib"))
        print(f"  ✓ Model saved to {path}")
    
    def load(self, path: str = None):
        path = path or os.path.join(MODEL_DIR, "anomaly_detector")
        self.model = joblib.load(os.path.join(path, "model.joblib"))
        self.scaler = joblib.load(os.path.join(path, "scaler.joblib"))
        self.is_trained = True


# ═══════════════════════════════════════════════════════════
# 5. JOB-FIT RECOMMENDER
# ═══════════════════════════════════════════════════════════

class JobFitRecommender:
    """
    Recommends the optimal (smallest adequate) machine for a given job.
    Rule-based + ML hybrid approach.
    """
    
    JOB_MACHINE_MAP = {
        "excavation": {
            "categories": ["Excavator"],
            "factors": {"depth": 1.5, "area": 0.01, "soil_hardness": 1.2},
        },
        "loading": {
            "categories": ["Loader", "Forklift"],
            "factors": {"weight": 1.0, "distance": 0.5},
        },
        "grading": {
            "categories": ["Bulldozer"],
            "factors": {"area": 0.02, "slope": 2.0},
        },
        "lifting": {
            "categories": ["Crane"],
            "factors": {"weight": 1.5, "height": 2.0},
        },
        "hauling": {
            "categories": ["Dump Truck"],
            "factors": {"weight": 0.8, "distance": 1.0},
        },
        "compaction": {
            "categories": ["Compactor"],
            "factors": {"area": 0.015, "depth": 0.5},
        },
        "power_generation": {
            "categories": ["Generator"],
            "factors": {"power_needed_kw": 1.0, "duration": 0.1},
        },
    }
    
    def recommend(self, job_type: str, equipment_df: pd.DataFrame,
                  area_sqm: float = None, depth_m: float = None,
                  weight_tons: float = None, duration_days: int = None,
                  soil_condition: str = None) -> List[Dict]:
        """Recommend equipment based on job requirements."""
        
        job_config = self.JOB_MACHINE_MAP.get(job_type.lower(), {})
        if not job_config:
            # Default: return top available by category
            available = equipment_df[equipment_df["status"] == "available"]
            return self._format_recommendations(available.head(5), "General availability")
        
        # Filter by compatible categories
        compatible = equipment_df[
            (equipment_df["category"].isin(job_config["categories"])) &
            (equipment_df["status"] == "available")
        ].copy()
        
        if compatible.empty:
            return []
        
        # Score each machine
        compatible["fit_score"] = 0.0
        
        # Base score from health
        compatible["fit_score"] += compatible["health_score"] * 0.3
        
        # Size optimization: prefer smallest adequate machine
        if weight_tons and "max_load_capacity" in compatible.columns:
            adequate = compatible["max_load_capacity"].fillna(999) >= weight_tons
            compatible.loc[adequate, "fit_score"] += 30
            # Bonus for being just right (not oversized)
            size_ratio = weight_tons / compatible["max_load_capacity"].fillna(999).replace(0, 999)
            compatible["fit_score"] += (size_ratio.clip(0, 1) * 20)
        
        if area_sqm:
            power_need = area_sqm * job_config["factors"].get("area", 0.01)
            power_ratio = power_need / compatible["engine_power_hp"].fillna(200).replace(0, 200)
            compatible["fit_score"] += (power_ratio.clip(0, 1) * 15)
        
        # Cost efficiency
        if duration_days:
            compatible["estimated_cost"] = compatible["daily_rate"] * duration_days
            max_cost = compatible["estimated_cost"].max()
            if max_cost > 0:
                compatible["fit_score"] += ((1 - compatible["estimated_cost"] / max_cost) * 15)
        
        # Soil condition modifier
        if soil_condition == "hard":
            compatible.loc[compatible["engine_power_hp"].fillna(0) > 250, "fit_score"] += 10
        elif soil_condition == "soft":
            compatible.loc[compatible["weight_tons"].fillna(0) < 25, "fit_score"] += 10
        
        # Normalize to 0-100
        max_score = compatible["fit_score"].max()
        if max_score > 0:
            compatible["fit_score"] = (compatible["fit_score"] / max_score * 100).round(1)
        
        # Sort by fit score
        top = compatible.nlargest(5, "fit_score")
        
        return self._format_recommendations(top, job_type)
    
    def _format_recommendations(self, df: pd.DataFrame, reason: str) -> List[Dict]:
        recommendations = []
        for _, row in df.iterrows():
            recommendations.append({
                "equipment_id": str(row["id"]),
                "name": row["name"],
                "model": row["model"],
                "category": row["category"],
                "daily_rate": float(row["daily_rate"]),
                "health_score": float(row.get("health_score", 0)),
                "fit_score": float(row.get("fit_score", 50)),
                "reason": f"Recommended for {reason}: optimal size-to-job ratio, "
                          f"health {row.get('health_score', 'N/A')}%",
            })
        return recommendations


# ═══════════════════════════════════════════════════════════
# TRAINING PIPELINE
# ═══════════════════════════════════════════════════════════

def train_all_models():
    """Train all ML models from synthetic data."""
    print("\n" + "=" * 60)
    print("  ML Training Pipeline — Caterpillar Dealer Platform")
    print("=" * 60 + "\n")
    
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # Load data
    print("Loading synthetic data...")
    rentals = pd.read_csv(os.path.join(DATA_DIR, "rentals.csv"))
    equipment = pd.read_csv(os.path.join(DATA_DIR, "equipment.csv"))
    daily_logs = pd.read_csv(os.path.join(DATA_DIR, "daily_logs.csv"))
    sensor_readings = pd.read_csv(os.path.join(DATA_DIR, "sensor_readings.csv"))
    print(f"  Loaded: {len(rentals)} rentals, {len(equipment)} equipment, "
          f"{len(daily_logs)} logs, {len(sensor_readings)} readings\n")
    
    # Train models
    results = {}
    
    # 1. Demand Forecasting
    demand_model = DemandForecaster()
    results["demand_forecasting"] = demand_model.train(rentals, equipment)
    demand_model.save()
    
    # 2. Predictive Maintenance
    maint_model = PredictiveMaintenanceModel()
    results["predictive_maintenance"] = maint_model.train(daily_logs, equipment)
    maint_model.save()
    
    # 3. Dynamic Pricing
    pricing_model = DynamicPricingEngine()
    results["dynamic_pricing"] = pricing_model.train(rentals, equipment)
    pricing_model.save()
    
    # 4. Anomaly Detection
    anomaly_model = AnomalyDetector()
    results["anomaly_detection"] = anomaly_model.train(sensor_readings)
    anomaly_model.save()
    
    print("\n" + "=" * 60)
    print("  All Models Trained Successfully!")
    print("=" * 60)
    print(json.dumps(results, indent=2))
    
    return results


if __name__ == "__main__":
    train_all_models()
