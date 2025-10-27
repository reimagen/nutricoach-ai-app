
import { NextResponse } from 'next/server';
import { admin, adminDb } from '@/lib/firebase-admin';
import { headers } from 'next/headers';

/**
 * Handles GET requests to /api/user to fetch the current user's data.
 */
export async function GET() {
  try {
    // 1. Get the Authorization header from the request
    const authorization = headers().get('Authorization');
    if (!authorization) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Verify the ID token from the Authorization header
    const idToken = authorization.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 3. Fetch the full user document from Firestore
    const userDoc = await adminDb.collection('users').doc(uid).get();

    // 4. If the document doesn't exist, return a 404 Not Found response
    if (!userDoc.exists) {
      return new NextResponse('User not found in database', { status: 404 });
    }

    // 5. Extract the data and return it
    const userData = userDoc.data();
    return NextResponse.json(userData);

  } catch (error) {
    console.error("Error fetching user data:", error);
    // If the token is invalid or expired, a 401 Unauthorized response is appropriate
    if ((error as any).code === 'auth/id-token-expired' || (error as any).code === 'auth/argument-error') {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
