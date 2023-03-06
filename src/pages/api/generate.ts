import type { APIRoute } from 'astro'
import {createParser, ParsedEvent, ReconnectInterval} from 'eventsource-parser'

const apiKey = import.meta.env.OPENAI_API_KEY

export const post: APIRoute = async (context) => {
  const body = await context.request.json()
  const text = body.input
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (!text) {
    return new Response('No input text')
  }

  const completion = await fetch('https://api.openai.com/v1/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model: 'text-davinci-003',
      prompt: generatePrompt(text),
      temperature: 0.6,
      max_tokens: 1200,
      stream: true,
    }),
  }) as { body: Iterable<BufferSource> }

  const stream = new ReadableStream({
    async start(controller) {
      const streamParser = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const json = JSON.parse(data)
            const text = json.choices[0].text
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(streamParser)
      for await (const chunk of completion.body) {
        parser.feed(decoder.decode(chunk))
      }
    }
  })

  return new Response(stream)
}

const generatePrompt = (text: string) => {
  return `Write 1 paragraph of continuation of the following story, answer in about 150 words.\n\n${ text }`
}