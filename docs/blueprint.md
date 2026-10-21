# **App Name**: RotaTurk

## Core Features:

- Manual Route Planning: Allow users to manually create routes by selecting start, end, and intermediate locations, utilizing the Google Maps API to display the route.
- Regional Tour Discovery: Enable users to discover pre-defined regional tours within Turkey.
- City Exploration: Enable users to find popular POIs in any city in Turkey, using static data to start with and expanding using a tool powered by the Google Maps API.
- Route Saving & Sharing: Allow users to save their created routes to Firestore and share them with others via a unique link.
- User Authentication: Implement user authentication using Firebase Authentication to enable route saving and personalized features.
- POI Reviews and Ratings: Enable users to submit reviews and ratings for Points of Interest (POIs), stored in Firestore.
- Real-time Presence: Show the real-time online status of other users to encourage users to start interacting with each other.

## Style Guidelines:

- Primary color: Vibrant turquoise (#2DC6A3) to evoke the beauty of Turkish landscapes.  This color choice conveys freshness and dynamism, like the many scenic routes this app will map.
- Background color: Light desaturated turquoise (#F2FCFA) to provide a calm and clean backdrop.  This almost-white value will help to keep the UI crisp.
- Accent color: Soft turquoise (#35B092) for interactive elements and highlights. The hue is near the primary, but different enough to stand out.
- Font: 'PT Sans' (sans-serif) for a modern and readable user interface. Note: currently only Google Fonts are supported.
- Use consistent and clear icons from libraries like Lucide React to represent actions and categories. Icons should complement the modern design.
- Employ rounded corners and subtle shadows to create a modern and visually appealing interface.
- Incorporate subtle animations for transitions and feedback to enhance the user experience.  Particularly when transitioning between pages and sections, and when a user interacts with an interactive element.