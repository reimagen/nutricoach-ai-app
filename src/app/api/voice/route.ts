
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

    // This function will handle piping the server response to our client
    const pipeResponseToClient = async (responseStream: AsyncGenerator<{ response: any; }>) => {
        for await (const res of responseStream) {
            if (res.response.speech?.audio?.content) {
                writer.write(res.response.speech.audio.content);
            }
            if (res.response.text) {
                const textPayload = JSON.stringify({ text: res.response.text });
                writer.write(new TextEncoder().encode(textPayload));
            }
        }
    };

    try {
        const historyParam = req.nextUrl.searchParams.get('history');
        const history = historyParam ? JSON.parse(historyParam) : [];

        const connection = ai.startChat({
            history: getSanitizedHistory(history),
        });

        const responseStream = await connection.sendStreamingContentStream(inputAudioStream as any);
        
        pipeResponseToClient(responseStream).finally(() => {
            writer.close();
        });

    } catch (e: any) {
        console.error("Error setting up Gemini connection:", e);
        try {
           await writer.abort(e);
        } catch(writeErr) {
            // writer might already be closed
        }
        // We can't return a normal response here because the headers might have already been sent.
        // The client will see the aborted stream.
    }


    // Return our transformed stream as the response
    return new Response(readable, {
        headers: {
            'Content-Type': 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
        },
    });
}
