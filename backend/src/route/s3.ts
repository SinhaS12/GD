import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    ListObjectsV2Command,
} from "@aws-sdk/client-s3";

if (!process.env.ACCESS_URL) {
    throw console.error("Can,t Access the URL");
}
const endpoints = process.env.ACCESS_URL;

if (!process.env.ACCESS_KEY_ID) {
    throw console.error("Can,t Access the ACCESS_KEY_ID");

}
const key_id = process.env.ACCESS_KEY_ID;
if (!process.env.ACCESS_KEY_SECRET) {
    throw console.error("Can,t Access the ACCESS_KEY_SECRET");

}
const secretAccessKey = process.env.ACCESS_KEY_SECRET;
const s3 = new S3Client({
    region: "auto",
    endpoint: endpoints,
    credentials: {
        accessKeyId: key_id,
        secretAccessKey: secretAccessKey,
    },
});

await s3.send(
    new PutObjectCommand({
        Bucket: "my-bucket",
        Key: "myfile.txt",
        Body: "Hello, R2!",
    }),
);
console.log("Uploaded myfile.txt");

// Download a file
const response = await s3.send(
    new GetObjectCommand({
        Bucket: "my-bucket",
        Key: "myfile.txt",
    }),
);
const content = await response.Body!.transformToString();
console.log("Downloaded:", content);

const list = await s3.send(
    new ListObjectsV2Command({
        Bucket: "my-bucket",
    }),
);
console.log(
    "Objects:",
    list.Contents!.map((obj) => obj.Key),
);