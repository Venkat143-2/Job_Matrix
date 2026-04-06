import { GoogleGenAI, Type } from "@google/genai";
import { Job, StudentProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: (import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY) || "" });

export const getJobRecommendations = async (student: StudentProfile, jobs: Job[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the student's skills (${student.skills.join(", ")}), education (${student.education}), and interests (${student.interests.join(", ")}), recommend the top 3 most suitable jobs from the following list: ${JSON.stringify(jobs)}. Return only the job IDs as a JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const getCandidateMatches = async (job: Job, students: StudentProfile[]) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based on the job requirements (${job.skillsRequired.join(", ")}), title (${job.title}), and description (${job.description}), find the best candidates from the following list: ${JSON.stringify(students)}. Return only the student IDs as a JSON array.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });
  return JSON.parse(response.text || "[]");
};

export const searchExternalJobs = async (student: StudentProfile) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Find 5 recent job openings for freshers from big MNCs (like Google, Microsoft, Amazon, TCS, Infosys, etc.) that match these skills: ${student.skills.join(", ")}. 
    For each job, provide: title, companyName, description, salary (if available), location, and a direct application URL. 
    Additionally, analyze the match between the student's profile and the job:
    1. matchPercentage: A number from 0-100.
    2. mismatchPercentage: A number from 0-100 (100 - matchPercentage).
    3. matchReason: Why the profile is a good fit.
    4. mismatchReason: What skills or qualifications are missing or don't align.
    Return the result as a JSON array of objects.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            companyName: { type: Type.STRING },
            description: { type: Type.STRING },
            salary: { type: Type.STRING },
            location: { type: Type.STRING },
            url: { type: Type.STRING },
            matchPercentage: { type: Type.NUMBER },
            mismatchPercentage: { type: Type.NUMBER },
            matchReason: { type: Type.STRING },
            mismatchReason: { type: Type.STRING }
          },
          required: ["title", "companyName", "description", "location", "url", "matchPercentage", "mismatchPercentage", "matchReason", "mismatchReason"]
        }
      }
    }
  });
  
  let jobs = [];
  try {
    jobs = JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse external jobs:", e);
  }
  
  // Add grounding metadata URLs if available
  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  return { jobs, sources: chunks || [] };
};

export const generateATSResume = async (student: StudentProfile, job: { title: string, companyName: string, description: string }) => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a professional, ATS-optimized resume for a student with these details:
    Name: ${student.displayName}
    Email: ${student.email}
    Phone: ${student.phone}
    Education: ${student.education}
    Skills: ${student.skills.join(", ")}
    Interests: ${student.interests.join(", ")}
    
    The resume should be tailored for this specific job:
    Job Title: ${job.title}
    Company: ${job.companyName}
    Job Description: ${job.description}
    
    Provide the response in JSON format with:
    1. resumeMarkdown: The full resume in professional Markdown format.
    2. atsScore: A number from 0-100 representing how well this resume matches the job description.
    3. optimizationTips: A list of 3 tips to further improve the ATS score for this specific job.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          resumeMarkdown: { type: Type.STRING },
          atsScore: { type: Type.NUMBER },
          optimizationTips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["resumeMarkdown", "atsScore", "optimizationTips"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
};
