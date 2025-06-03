// /app/api/ask/route.ts
import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge', // or 'nodejs'
};

export async function POST(req: Request) {
  const body = await req.json();

  console.log('Received prompt from frontend:', body.prompt);

  try {
    const ollamaRes = await fetch('http://ollama:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'deepseek-r1:latest',
        prompt: `${body.prompt}`,
        stream: true,
      }),
    });

    if (!ollamaRes.body) {
      return NextResponse.json(
        { error: 'Failed to read stream from Ollama' },
        { status: 500 }
      );
    }

    const reader = ollamaRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullOllamaResponse = ''; // สะสม response ทั้งหมดรวม think tag

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: true });

      let lastNewlineIndex = buffer.lastIndexOf('\n');

      if (done && lastNewlineIndex === -1) {
          lastNewlineIndex = buffer.length;
      }
      
      if (lastNewlineIndex !== -1) {
          const completeLines = buffer.substring(0, lastNewlineIndex);
          buffer = buffer.substring(lastNewlineIndex + 1);

          for (const line of completeLines.split('\n')) {
              if (line.trim() === '') continue;
              try {
                  const json = JSON.parse(line);
                  let responseChunk = json.response ?? '';
                  // *** ตรงนี้สำคัญ: ไม่มีการกรอง <think> tags ออกจาก responseChunk ***
                  fullOllamaResponse += responseChunk; // สะสมข้อความต้นฉบับทั้งหมด
              } catch (e) {
                  console.warn('Invalid JSON chunk from Ollama, skipping:', line, e);
              }
          }
      }

      if (done) {
          if (buffer.trim() !== '') {
              try {
                  const json = JSON.parse(buffer);
                  let responseChunk = json.response ?? '';
                  fullOllamaResponse += responseChunk; // สะสมข้อความต้นฉบับทั้งหมด
              } catch (e) {
                  console.warn('Final buffer contains invalid JSON, could not parse:', buffer, e);
              }
          }
          break;
      }
    }

    // ส่ง fullOllamaResponse ที่มี <think> tags กลับไปให้ Frontend
    return NextResponse.json(
      { response: fullOllamaResponse.trim() }, // ใช้ trim() เพื่อจัดการ whitespace ทั่วไป
      { status: 200 }
    );

  } catch (error: any) {
    console.error('Error during initial fetch to Ollama:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch from Ollama' },
      { status: 500 }
    );
  }
}