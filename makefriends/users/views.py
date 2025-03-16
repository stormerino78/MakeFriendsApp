from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .models import UserProfile
from .serializers import UserProfileSerializer

class UserRegistrationView(APIView):
    permission_classes = [AllowAny]  # Allow unauthenticated users to register
    
    def post(self, request):
        # Deserialize the request data
        serializer = UserProfileSerializer(data=request.data, context={'request': request})

        # Validate and save the data if it"s valid
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "User created successfully."}, status=status.HTTP_201_CREATED)
        
        # If data is invalid, return a bad request response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UserProfileViewSet(viewsets.ModelViewSet):
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = [IsAuthenticated]  # Only logged-in users can access
    # Add the parsers to handle both JSON and multipart/form-data
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def retrieve(self, request, pk=None):
        """
        Retrieve the authenticated user's profile.
        Expect URL: /api/users/me/
        """
        # Allow only "me" as pk for current user.
        if pk != 'me':
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        # Ensure a profile exists.
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, context={'request': request})
        print(serializer.data)
        return Response(serializer.data)

    def partial_update(self, request, pk=None):
        """
        Update parts of the authenticated user's profile.
        Expect URL: /api/users/me/
        """
        if pk != 'me':
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def lockout(request, credentials, *args, **kwargs):
    return Response(
        {"detail": "Your account has been locked due to too many failed login attempts. Please try again later."},
        status=status.HTTP_403_FORBIDDEN
    )
