import { writeFile } from "fs";
import Handlebars, { template } from "handlebars";
import { mailClient } from "./redis";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import mjml from "./mjml";
import { randomUUID } from "crypto";

export let mailAccount = { user: process.env.MAILUSER + "@mail." + process.env.DOMAIN, pass: process.env.MAILPASSWORD };

let transporter =
  process.env.DEV == "true" || process.env.DOMAIN == undefined
    ? (async () => {
        mailAccount = await nodemailer.createTestAccount();
        if (process.env.NODE_ENV != "test") {
          console.log(mailAccount);
        }
        return nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false, // true for 465, false for other ports
          auth: {
            user: mailAccount.user, // generated ethereal user
            pass: mailAccount.pass, // generated ethereal password
          },
        });
      })()
    : nodemailer.createTransport(
        new SMTPTransport({
          host: "localhost",
          port: 587,
          secure: false,
          auth: {
            user: mailAccount.user,
            pass: mailAccount.pass,
          },
          tls: {
            rejectUnauthorized: false,
            secureProtocol: "TLSv1_method",
          },
        })
      );

const sendMail = async (from: string, to: string, subject: string, text?: string, html?: string) => {
  return await (
    await transporter
  ).sendMail({
    from: from,
    to: to,
    subject: subject,
    text: text,
    html: html,
  });
};

export const verificationMail = async (to: string, eventName: string, verificationLink: string) => {
  const raw = mjml.getTemplate("emailVerification");

  //TODO: Replace other handlebars with final values
  const message = Handlebars.compile(raw);

  const data = { eventName, verificationLink };
  const compiled = message(data);

  sendMail(mailAccount.user, to, "Verify Email", undefined, compiled);
};

export default { sendMail };
