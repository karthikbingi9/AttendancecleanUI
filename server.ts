import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow larger payloads for base64 image / PDF timetable uploads
  app.use(express.json({ limit: '20mb' }));

  // POST /api/timetable/extract
  // Extracts weekly timetable schedules and subject frequencies from uploaded images/PDFs or raw text
  app.post('/api/timetable/extract', async (req, res) => {
    try {
      const { mimeType, base64Data, rawText } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: 'GEMINI_API_KEY is not configured. Please check the Settings > Secrets panel in AI Studio.',
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const promptText = `You are an expert academic schedule parser. Analyze this weekly class timetable and extract every scheduled class slot and subject summary.
Rules:
1. Normalize dayOfWeek strictly to one of: "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday".
2. Format startTime and endTime in 24-hour "HH:MM" format (e.g. "09:00", "14:30"). If end time is not explicit, assume a 1-hour period after startTime.
3. Group identical courses under a clean, consistent subjectName and short subjectCode (e.g. "CS-301").
4. Count how many periods each subject occurs per week across the extracted schedule.
5. Ignore lunch breaks, recess, or empty free slots.`;

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

      if (base64Data && mimeType) {
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }

      if (rawText) {
        parts.push({
          text: `Additional timetable text/context:\n${rawText}`,
        });
      }

      parts.push({ text: promptText });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjects: {
                type: Type.ARRAY,
                description: 'List of unique academic subjects detected in the timetable.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: 'Full clean name of the subject (e.g., Data Structures & Algorithms).',
                    },
                    code: {
                      type: Type.STRING,
                      description: 'Course code or short identifier (e.g., CS301).',
                    },
                    periodsPerWeek: {
                      type: Type.INTEGER,
                      description: 'Total number of classes/periods scheduled for this subject per week.',
                    },
                    professor: {
                      type: Type.STRING,
                      description: 'Instructor name if visible, otherwise empty string.',
                    },
                  },
                  required: ['name', 'code', 'periodsPerWeek'],
                },
              },
              slots: {
                type: Type.ARRAY,
                description: 'Individual weekly class slots extracted from the timetable.',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    subjectName: {
                      type: Type.STRING,
                      description: 'Must match one of the extracted subject names.',
                    },
                    subjectCode: {
                      type: Type.STRING,
                      description: 'Short code matching the subject.',
                    },
                    dayOfWeek: {
                      type: Type.STRING,
                      description: 'One of Monday, Tuesday, Wednesday, Thursday, Friday, Saturday.',
                    },
                    startTime: {
                      type: Type.STRING,
                      description: '24-hour format HH:MM, e.g. 09:00',
                    },
                    endTime: {
                      type: Type.STRING,
                      description: '24-hour format HH:MM, e.g. 10:00',
                    },
                    room: {
                      type: Type.STRING,
                      description: 'Room or lab number if visible, e.g. Room 402 or Lab B.',
                    },
                  },
                  required: ['subjectName', 'dayOfWeek', 'startTime', 'endTime'],
                },
              },
            },
            required: ['subjects', 'slots'],
          },
        },
      });

      const rawJson = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawJson);

      return res.json({
        success: true,
        data: parsed,
      });
    } catch (error: unknown) {
      console.error('Timetable extraction error:', error);
      const errMessage = error instanceof Error ? error.message : 'Failed to parse timetable with Gemini Vision AI.';
      return res.status(500).json({
        error: errMessage,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
