from django.urls import path
from . import views

urlpatterns = [
    path('', views.CaseListView.as_view(), name='case-list'),
    path('new/', views.CaseCreateView.as_view(), name='case-create'),
    path('settings/', views.settings_view, name='settings'),
    path('case/<int:pk>/', views.case_detail, name='case-detail'),
    path('case/<int:pk>/edit/', views.CaseUpdateView.as_view(), name='case-update'),
    path('case/<int:pk>/delete/', views.CaseDeleteView.as_view(), name='case-delete'),
    path('case/<int:pk>/import/', views.transaction_import, name='transaction-import'),
    path('case/<int:pk>/import/preview/', views.transaction_preview, name='transaction-preview'),
    path('case/<int:pk>/analysis/', views.analysis_dashboard, name='analysis-dashboard'),
    path('case/<int:pk>/export/<str:export_type>/', views.export_csv, name='export-csv'),
]
