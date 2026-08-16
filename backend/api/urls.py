from django.urls import path
from . import views

urlpatterns = [
    path('session/', views.CreateSessionView.as_view(), name='create-session'),
    path('keystrokes/', views.SubmitKeystrokesView.as_view(), name='submit-keystrokes'),
    path('predict/', views.PredictView.as_view(), name='predict'),
    path('result/<uuid:session_id>/', views.SessionResultView.as_view(), name='session-result'),
    path('health/', views.HealthCheckView.as_view(), name='health-check'),
]
