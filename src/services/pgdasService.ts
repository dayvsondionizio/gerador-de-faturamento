import Groq from "groq-sdk";

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const client = new Groq({ apiKey: API_KEY });

export interface ExtractedPGDAS {
  companyName: string;
  cnpj: string;
  monthlyBilling: {
    month: string;
    value: number;
  }[];
}

export async function parsePGDASFile(file: File): Promise<ExtractedPGDAS> {
  const base64Promise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const base64Data = await base64Promise;

  const prompt = `
    Analise este documento PGDAS (Programa Gerador do Documento de Arrecadação do Simples Nacional).
    Extraia as seguintes informações em formato JSON estritamente:
    1. Nome da Empresa (Razão Social)
    2. CNPJ
    3. Demonstrativo de Faturamento Mensal: Extraia os meses e valores da seção "2.2.1) Mercado Interno" ou "2.2) Receitas Brutas Anteriores".
       Os meses devem ser no formato MM/AAAA.
       Os valores devem ser números.

    Retorne APENAS o JSON no seguinte formato:
    {
      "companyName": "NOME DA EMPRESA",
      "cnpj": "00.000.000/0000-00",
      "monthlyBilling": [
        { "month": "01/2025", "value": 158000.00 },
        ...
      ]
    }
  `;

  const chatCompletion = await client.chat.completions.create({
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${file.type};base64,${base64Data}`
            }
          }
        ]
      }
    ],
    model: "llama-3.2-90b-vision-preview",
    temperature: 0.3,
    response_format: { type: "json_object" }
  });

  const text = chatCompletion.choices[0]?.message?.content;
  if (!text) throw new Error("Não foi possível extrair dados do PGDAS.");

  return JSON.parse(text);
}
