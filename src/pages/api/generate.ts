import type { APIRoute } from 'astro'
import { Configuration, OpenAIApi } from 'openai'
import {createParser, ParsedEvent, ReconnectInterval} from 'eventsource-parser'

const apiKey = import.meta.env.OPENAI_API_KEY

const configuration = new Configuration({
  apiKey,
})
const openai = new OpenAIApi(configuration)

const encoder = new TextEncoder()

export const get: APIRoute = async (context) => {
  const params = context.url.searchParams
  const text = params.get('input')
  const decoder = new TextDecoder()

  if (!text) {
    // throw new Error('No input text')
    return
  }

  // const completion = await openai.createCompletion({
  //   model: 'text-davinci-003',
  //   prompt: generatePrompt(text),
  //   temperature: 0.6,
  //   max_tokens: 300,
  //   stream: true,
  // })

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
      max_tokens: 300,
      stream: true,
    }),
  })

  const stream = new ReadableStream({
    async start(controller) {

      const streamParser = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          // console.log('Received event!')
          // console.log('id: %s', event.id || '<none>')
          // console.log('data: %s', event.data)
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
      for await (const chunk of completion.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    }
  })

  return new Response(stream)
}

const generatePrompt = (text: string) => {
  return `续写一篇小说。
  
  ${ text }`
}