import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing env var from OpenAI");
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

type Correction = {
  original: string;
  corrected: string;
  offset: number;
};

type Data = {
  result?: Correction[];
  error?: string;
};

function generatePrompt(message: string) {
  return `Pretend that you are an English Grammar teacher. 
    Correct the grammatical mistakes in this text by replying in JSON. 
    The JSON should contain a corrections array and each correction should contain the original word that needs to be corrected, and the recommended correction for the word as well. Include offset position of orignal word as well. 
    The output should be json. 
    
    Here is my text: ${message}.`;
}

const defaultErrorMessage = "Failed to process your request";
const defaultErrorStatus = 500;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const content = req.body.content;

    if (!content) {
      console.log("Missing content");
      return res.status(defaultErrorStatus).json({ error: "Missing Content" });
    }

    let prompt = generatePrompt(content);

    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 800,
      n: 1,
    });

    const response_content = (
      completion?.data?.choices[0]?.message?.content ?? "[]"
    ).toString();
    const response = JSON.parse(response_content);

    return res.status(200).json({ result: response });
  } catch (error: any) {
    if (error.response) {
      return res.status(error?.response?.status || defaultErrorStatus).json({
        error: error?.response?.data || defaultErrorMessage,
      });
    }

    return res
      .status(defaultErrorStatus)
      .json({ error: error?.message || defaultErrorMessage });
  }
}
