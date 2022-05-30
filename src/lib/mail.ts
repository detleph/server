import { writeFile } from "fs";
import Handlebars, { template } from "handlebars";
import { mailClient } from "./redis";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

import mjml from "./mjml";
import logger from "../Middleware/error/logger";

export let mailAccount = { user: process.env.MAILUSER + "@mail." + process.env.DOMAIN, pass: process.env.MAILPASSWORD };

let transporter =
  process.env.NODE_ENV == "development" || process.env.DOMAIN == undefined
    ? (async () => {
        if (process.env.ETHEREAL_EMAIL == undefined || process.env.ETHEREAL_PASSWORD == undefined) {
          mailAccount = await nodemailer.createTestAccount();
        } else {
          mailAccount = {
            user: process.env.ETHEREAL_EMAIL,
            pass: process.env.ETHEREAL_PASSWORD,
          };
        }
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
  logger.debug(`Sent email to: ${to}`);

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

  verificationLink = "https://" + (process.env.DOMAIN ?? "localhost:3000") + "/api/users/verify/" + verificationLink;
  const message = Handlebars.compile(raw);

  const data = { eventName, verificationLink };
  const compiled = message(data);

  sendMail(mailAccount.user, to, "Verify Email", undefined, compiled);
};

export default { sendMail };
