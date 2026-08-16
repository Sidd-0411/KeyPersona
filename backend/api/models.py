from django.db import models
import uuid

class Session(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    user_agent = models.TextField(blank=True, default="")
    keyboard_type = models.CharField(max_length=50, blank=True, default="unknown")
    status = models.CharField(max_length=20, default="active")

    def __str__(self):
        return f"Session {self.id} ({self.status})"

class KeystrokeEvent(models.Model):
    session = models.ForeignKey(Session, on_delete=models.CASCADE, related_name='events')
    task_id = models.CharField(max_length=50)
    event_type = models.CharField(max_length=10)  # keydown / keyup
    key = models.CharField(max_length=50)
    code = models.CharField(max_length=50)
    timestamp = models.FloatField()  # ms from performance.now()
    is_repeat = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

class PredictionResult(models.Model):
    session = models.OneToOneField(Session, on_delete=models.CASCADE, related_name='prediction')
    openness = models.FloatField()
    conscientiousness = models.FloatField()
    extraversion = models.FloatField()
    agreeableness = models.FloatField()
    neuroticism = models.FloatField()
    features_json = models.JSONField(default=dict)
    explanations_json = models.JSONField(default=dict)
    # Emotion fields
    emotion_label = models.CharField(max_length=20, blank=True, default="")
    emotion_valence = models.FloatField(null=True, blank=True)
    emotion_arousal = models.FloatField(null=True, blank=True)
    emotion_scores_json = models.JSONField(default=dict)
    model_version = models.CharField(max_length=50, default="xgb_v1")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Prediction for {self.session_id}"
