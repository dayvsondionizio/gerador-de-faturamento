import axios from "axios";

export default async function handler(req, res) {
  const logoUrl = 'https://minio.contadordepadaria.com/api/v1/buckets/typebot/objects/download?preview=true&prefix=logos%2FContador%20de%20Padarias%2FLogo%20-%20CP%20AZUL.png&version_id=null';
  
  try {
    const response = await axios.get(logoUrl, { responseType: 'arraybuffer' });
    const contentType = response.headers["content-type"] || "image/png";
    
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send("Error fetching logo");
  }
}
