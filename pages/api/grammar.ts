import type { NextApiRequest, NextApiResponse } from "next";
import { Configuration, OpenAIApi } from "openai";

if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing env var from OpenAI");
}

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

type Data = {
    result: any;
};


function generatePrompt(message: string) {
    return `Pretend that you are an English Grammar teacher. 
    Correct the grammatical mistakes in this text by replying in JSON. 
    The JSON should contain a corrections array and each correction should contain the original word that needs to be corrected, the start and end position of the word in the text, and the recommended correction for the word as well, also if it is possible to provide an array of improvements to improve my text. The output should be json. 
    
    Here is my text: ${message}.`;
}

export default async function handler(
    req: Request) {
    try {
        const { message } = (await req.json()) as {
            message?: string;
        };

        if (!message) {
            return new Response("Missing message in ther request", { status: 400 });
        }

        let prompt = generatePrompt(message);

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

        console.log(completion.data.choices[0].message);

        const response_message = (completion?.data?.choices[0]?.message ?? "{}").toString();
        return new Response(response_message, { status: 200 });
    }
    catch (err: any) {
        if (err.resp) {
            console.log(err.resp.status);
            console.log(err.resp.data);
        }
        else {
            console.log(err);
        }

        return new Response(err, { status: 500 });
    }
}
