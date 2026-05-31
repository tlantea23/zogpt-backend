import { Redis } from '@upstash/redis';
import OpenAI from 'openai';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method!== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, userId = 'default' } = req.body;

    const history = await redis.get(userId) || [];

    const messages = [
      { role: 'system', content: 'You are Zogpt, a helpful AI assistant.' },
     ...history,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
    });

    const reply = completion.choices[0].message.content;

    const newHistory = [...history, { role: 'user', content: message }, { role: 'assistant', content: reply }];
    await redis.set(userId, newHistory.slice(-10));

    res.status(200).json({ reply });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
}