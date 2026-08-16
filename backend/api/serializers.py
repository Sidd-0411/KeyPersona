from rest_framework import serializers
from .models import Session, KeystrokeEvent, PredictionResult


class KeystrokeEventSerializer(serializers.Serializer):
    event_type = serializers.CharField()
    key = serializers.CharField(allow_blank=True)
    code = serializers.CharField(allow_blank=True)
    timestamp = serializers.FloatField()
    is_repeat = serializers.BooleanField(default=False)
    task_id = serializers.CharField(default="task_1", required=False)


class SubmitKeystrokesSerializer(serializers.Serializer):
    session_id = serializers.UUIDField(required=False)
    task_id = serializers.CharField()
    events = KeystrokeEventSerializer(many=True)
    user_agent = serializers.CharField(required=False, default="")
    keyboard_type = serializers.CharField(required=False, default="unknown")


class PredictRequestSerializer(serializers.Serializer):
    session_id = serializers.UUIDField()
