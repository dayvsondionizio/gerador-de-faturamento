import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export interface ExtractedPGDAS {
  companyName: string;
  cnpj: string;
  monthlyBilling: {
    month: string;
    value: number;
  }[];
}

export async function parsePGDASFile(file: File): Promise<ExtractedPGDAS> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Convert file to base64
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

  const result = await model.generateContent([
    {
      inlineData: {
        data: base64Data,
        mimeType: file.type
      }
    },
    prompt
  ]);

  const response = await result.response;
  const text = response.text();
  
  // Clean potential markdown blocks from Gemini response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Não foi possível extrair dados do PGDAS.");
  
  return JSON.parse(jsonMatch[0]);
}
