import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from .models import Session, KeystrokeEvent, PredictionResult
from .serializers import SubmitKeystrokesSerializer, PredictRequestSerializer
from .feature_extractor import extract_features, features_to_dict
from .ml_service import get_predictor

logger = logging.getLogger(__name__)

class CreateSessionView(APIView):
    def post(self, request):
        session = Session.objects.create(user_agent=request.data.get("user_agent",""), keyboard_type=request.data.get("keyboard_type","unknown"))
        return Response({"session_id":str(session.id),"status":"created"}, status=status.HTTP_201_CREATED)

class SubmitKeystrokesView(APIView):
    def post(self, request):
        ser = SubmitKeystrokesSerializer(data=request.data)
        if not ser.is_valid(): return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        data = ser.validated_data
        sid = data.get("session_id")
        if sid:
            try: session = Session.objects.get(id=sid)
            except Session.DoesNotExist: session = Session.objects.create()
        else: session = Session.objects.create()
        objs = [KeystrokeEvent(session=session, task_id=data["task_id"], event_type=e["event_type"], key=e["key"], code=e["code"], timestamp=e["timestamp"], is_repeat=e.get("is_repeat",False)) for e in data["events"]]
        KeystrokeEvent.objects.bulk_create(objs)
        total = session.events.count()
        kd = session.events.filter(event_type="keydown").count()
        return Response({"session_id":str(session.id),"task_id":data["task_id"],"events_saved":len(data["events"]),"total_events":total,"keydowns":kd,"status":"saved"})

class PredictView(APIView):
    def post(self, request):
        ser = PredictRequestSerializer(data=request.data)
        if not ser.is_valid(): return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)
        session_id = ser.validated_data["session_id"]
        session = get_object_or_404(Session, id=session_id)
        events = list(session.events.all().order_by("timestamp").values("event_type","key","code","timestamp","is_repeat"))
        if len(events) < 30:
            return Response({"error":"Insufficient keystroke data","events_count":len(events),"minimum":30}, status=status.HTTP_400_BAD_REQUEST)
        raw_features = extract_features(events)
        if raw_features is None:
            return Response({"error":"Feature extraction failed"}, status=status.HTTP_400_BAD_REQUEST)
        predictor = get_predictor()
        result = predictor.predict(raw_features)
        PredictionResult.objects.update_or_create(session=session, defaults={
            "openness":result["predictions"]["Openness"]["score"],
            "conscientiousness":result["predictions"]["Conscientiousness"]["score"],
            "extraversion":result["predictions"]["Extraversion"]["score"],
            "agreeableness":result["predictions"]["Agreeableness"]["score"],
            "neuroticism":result["predictions"]["Neuroticism"]["score"],
            "features_json":result["features"],
            "explanations_json":result["explanations"],
            "emotion_label":result["emotions"]["dominant_emotion"],
            "emotion_valence":result["emotions"]["valence"],
            "emotion_arousal":result["emotions"]["arousal"],
            "emotion_scores_json":result["emotions"]["scores"],
        })
        session.status = "predicted"; session.save()
        return Response({"session_id":str(session_id),"predictions":result["predictions"],"explanations":result["explanations"],"features":result["features"],"model_info":result["model_info"],"emotions":result["emotions"],"events_analyzed":len(events),"status":"completed"})

class SessionResultView(APIView):
    def get(self, request, session_id):
        session = get_object_or_404(Session, id=session_id)
        try: pred = session.prediction
        except PredictionResult.DoesNotExist: return Response({"error":"No prediction found"}, status=status.HTTP_404_NOT_FOUND)
        return Response({"session_id":str(session_id),"predictions":{"Openness":{"score":pred.openness},"Conscientiousness":{"score":pred.conscientiousness},"Extraversion":{"score":pred.extraversion},"Agreeableness":{"score":pred.agreeableness},"Neuroticism":{"score":pred.neuroticism}},"explanations":pred.explanations_json,"features":pred.features_json,"emotions":{"dominant_emotion":pred.emotion_label,"valence":pred.emotion_valence,"arousal":pred.emotion_arousal,"scores":pred.emotion_scores_json},"created_at":pred.created_at.isoformat()})

class HealthCheckView(APIView):
    def get(self, request):
        try:
            p = get_predictor(); n = len(p.models)
        except Exception as e:
            return Response({"status":"unhealthy","error":str(e)}, status=500)
        return Response({"status":"healthy","models_loaded":n,"traits":list(p.models.keys()),"metrics":p.training_results})
