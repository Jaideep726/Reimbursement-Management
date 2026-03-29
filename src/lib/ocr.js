export async function parseReceiptWithOCR(base64Image, mediaType = 'image/jpeg') {
  const key = import.meta.env.VITE_GEMINI_API_KEY

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mediaType,
                data: base64Image
              }
            },
            {
              text: `Extract expense details from this receipt. Return ONLY valid JSON, no markdown, no explanation:
{
  "amount": <number or null>,
  "currency": <3-letter ISO code or null>,
  "date": <YYYY-MM-DD or null>,
  "merchant": <string or null>,
  "category": <one of: Food, Travel, Accommodation, Office Supplies, Entertainment, Medical, Other>,
  "description": <short description string>
}`
            }
          ]
        }]
      })
    }
  )

  const data = await response.json()

  try {
    const text = data.candidates[0].content.parts[0].text.trim()
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    console.log('GEMINI RESPONSE:', JSON.stringify(data))
    throw new Error('Failed to parse OCR response')
  }
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}