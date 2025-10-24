
import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function getSanitizedHistory(history: any[]) {
    return history.map(turn => ({
        role: turn.actor === 'ai' ? 'model' : 'user',
        parts: [{ text: turn.text }]
    }));
}

export async function POST(req: NextRequest) {
    if (!req.body) {
        return new Response('No request body', { status: 400 });
    }

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const inputAudioStream = req.body;

    const { readable, writable } = new TransformStream();
    const writer = writable.createWriter();

    // Use a simpler callback structure
    const callbacks = {
        onmessage: async (res: any) => {
            if (res.response.speech?.audio?.content) {
                writer.write(res.response.speech.audio.content);
            }
            if (res.response.text) {
                const textPayload = JSON.stringify({ text: res.response.text });
                writer.write(new TextEncoder().encode(textPayload));
            }
        },
        onclose: () => {
            console.log('Gemini API connection closed.');
            writer.close();
        },
        onerror: (err: any) => {
            console.error('Gemini API connection error:', err);
            writer.abort(err);
        },
    };

    try {
        const historyParam = req.nextUrl.searchParams.get('history');
        const history = historyParam ? JSON.parse(historyParam) : [];

        const connection = await ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            history: getSanitizedHistory(history),
            callbacks,
            audio: {
                input: { sampleRate: 16000 },
                output: {
                    sampleRate: 24000,
                    encoding: 'LINEAR16',
                    voice: 'Zephyr',
                },
            },
        });

        // Pipe the incoming request stream to the Gemini connection
        const reader = inputAudioStream.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                console.log('Client stream finished.');
                await connection.close();
                break;
            }
            connection.send(value);
        }

    } catch (e: any) {
        console.error("Error setting up Gemini connection:", e);
        return new Response(`Error setting up stream: ${e.message}`, { status: 500 });
    }


    // Return our transformed stream as the response
    return new Response(readable, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
