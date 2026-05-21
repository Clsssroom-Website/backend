import { google } from "googleapis";
import fs from "fs";
import { logger } from "../utils/logger.js";
const getGoogleAuth = () => {
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath && fs.existsSync(credentialsPath)) {
        return new google.auth.JWT({
            keyFile: credentialsPath,
            scopes: [
                "https://www.googleapis.com/auth/forms.body",
                "https://www.googleapis.com/auth/forms.responses.readonly",
                "https://www.googleapis.com/auth/drive.readonly",
            ],
        });
    }
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (privateKey) {
        privateKey = privateKey.trim();
        while (privateKey.startsWith('"') || privateKey.startsWith("'")) {
            privateKey = privateKey.slice(1);
        }
        while (privateKey.endsWith('"') ||
            privateKey.endsWith("'") ||
            privateKey.endsWith(",") ||
            privateKey.endsWith(";")) {
            privateKey = privateKey.slice(0, -1);
        }
        privateKey = privateKey.replace(/\\n/g, "\n").trim();
    }
    if (!email || !privateKey) {
        throw new Error("Google API credentials are not configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_PRIVATE_KEY.");
    }
    return new google.auth.JWT({
        email,
        key: privateKey,
        scopes: [
            "https://www.googleapis.com/auth/forms.body",
            "https://www.googleapis.com/auth/forms.responses.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
        ],
    });
};
export class GoogleFormsService {
    /**
     * Creates a Google Form configured as a Quiz and gathering emails.
     */
    async createQuizForm(title) {
        try {
            const auth = getGoogleAuth();
            const forms = google.forms({ version: "v1", auth });
            // 1. Create a blank form
            const createRes = await forms.forms.create({
                requestBody: {
                    info: {
                        title,
                    },
                },
            });
            const formId = createRes.data.formId;
            const responderUri = createRes.data.responderUri;
            if (!formId || !responderUri) {
                throw new Error("Failed to create Google Form: Missing formId or responderUri");
            }
            // 2. Set settings: enable Quiz Mode and email collection
            await forms.forms.batchUpdate({
                formId,
                requestBody: {
                    requests: [
                        {
                            updateSettings: {
                                settings: {
                                    quizSettings: {
                                        isQuiz: true,
                                    },
                                    emailCollectionType: "RESPONDER_INPUT",
                                },
                                updateMask: "quizSettings.isQuiz,emailCollectionType",
                            },
                        },
                    ],
                },
            });
            logger.info(`Google Form Quiz created successfully: ${formId}`);
            return { formId, responderUri };
        }
        catch (error) {
            logger.error("Error creating Google Form Quiz:", error);
            throw error;
        }
    }
    /**
     * Registers a watch (webhook subscription) on a Google Form for submissions.
     */
    async createFormWatch(formId) {
        try {
            const auth = getGoogleAuth();
            const forms = google.forms({ version: "v1", auth });
            const pubsubTopic = process.env.PUBSUB_TOPIC;
            if (!pubsubTopic) {
                throw new Error("PUBSUB_TOPIC environment variable is not configured.");
            }
            // Watches require a unique watchId (can be generated, or we let the API generate it)
            await forms.forms.watches.create({
                formId,
                requestBody: {
                    watch: {
                        target: {
                            topic: {
                                topicName: pubsubTopic,
                            },
                        },
                        eventType: "RESPONSES",
                    },
                },
            });
            logger.info(`Google Form Watch registered successfully for Form: ${formId}`);
        }
        catch (error) {
            logger.error(`Error registering Google Form Watch for Form ${formId}:`, error);
            throw error;
        }
    }
    /**
     * Retrieves a student's email and total score for a specific response.
     */
    async getFormResponse(formId, responseId) {
        try {
            const auth = getGoogleAuth();
            const forms = google.forms({ version: "v1", auth });
            const res = await forms.forms.responses.get({
                formId,
                responseId,
            });
            const data = res.data;
            const email = data.respondentEmail || "";
            const score = data.totalScore !== undefined ? Number(data.totalScore) : null;
            logger.info(`Fetched Google Form response for form ${formId}, response ${responseId}: Email=${email}, Score=${score}`);
            return { email, score };
        }
        catch (error) {
            logger.error(`Error fetching Google Form response for ${formId}/${responseId}:`, error);
            throw error;
        }
    }
}
