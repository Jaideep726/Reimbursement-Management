// OCR receipt parsing using Claude API
// Takes a base64 image string, returns structured expense fields

export async function parseReceiptWithOCR(base64Image, mediaType = 'image/jpeg') {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: `Extract expense details from this receipt. Return ONLY valid JSON, no markdown, no explanation:
{
  "amount": <number or null>,
  "currency": <3-letter ISO code or null>,
  "date": <YYYY-MM-DD or null>,
  "merchant": <string or null>,
  "category": <one of: Food, Travel, Accommodation, Office Supplies, Entertainment, Medical, Other>,
  "description": <short description string>
}`,
            },
          ],
        },
      ],
    }),
  })

  const data = await response.json()

  try {
    const text = data.content[0].text.trim()
    return JSON.parse(text)
  } catch {
    throw new Error('Failed to parse OCR response')
  }
}

// Helper: convert File object to base64
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
