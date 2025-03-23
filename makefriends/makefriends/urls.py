"""
URL configuration for makefriends project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from two_factor.urls import urlpatterns as tf_urls
from rest_framework.routers import DefaultRouter
from users.views import UserProfileViewSet, UserRegistrationView, NearbyUsersView, ChatHistoryView, PokeView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from events.views import EventViewSet

router = DefaultRouter()
router.register(r'users', UserProfileViewSet)
router.register(r'events', EventViewSet)

urlpatterns = [
    path('', include(tf_urls)),
    path('api/', include(router.urls)), # User and events endpoint
    path('register/', UserRegistrationView.as_view(), name='user_register'), # User registration endpoint
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), # Get token endpoint
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), # Get refreshed token endpoint
    path('dj-rest-auth/', include('dj_rest_auth.urls')),  # Provides endpoints /dj-rest-auth/login/ and /dj-rest-auth/logout/
    path('dj-rest-auth/registration/', include('dj_rest_auth.registration.urls')),  # Registration endpoint
    path('accounts/', include('allauth.urls')),  # Needed for the social account flows
    path('api/nearby-users/', NearbyUsersView.as_view(), name='nearby_users'),
    path('api/chats/me/', ChatHistoryView.as_view(), name='chat_history'),
    path('api/poke/', PokeView.as_view(), name='poke'),

]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)