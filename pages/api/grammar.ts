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
    req: NextApiRequest,
    res: NextApiResponse<Data>
) {
    console.log('/api/grammar', req.body);
    try {
        const content = req.body.content;

        if (!content) {
            console.log('Missing content');
            return res.status(500).json("Missing Content");
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

        const response_content = (completion?.data?.choices[0]?.message?.content ?? "{}").toString();
        const response = JSON.parse(response_content);

        console.log('api response: ', response);
        return res.status(200).json({ result: response });
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
