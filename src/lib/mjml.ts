import fs from "fs";
import path from "path";
import mjml from "mjml";

const template_folder = "/app/resources/email/templates/";

const compileTemplates = () => {
  console.log("Compiling templates: ");

  fs.readdir(template_folder, (err, files) => {
    if (err) console.log(err);

    files.forEach((file) => {
      if (path.extname(file) !== ".mjml") return;

      let content = fs.readFileSync(template_folder + file);
      let mjmlres = mjml(content.toString());

      let hbs = template_folder + file.replace(".mjml", ".hbs");
      fs.writeFileSync(hbs, mjmlres.html);
    });
  });
};

compileTemplates(); // This will compile all templates when this file is first included

const getTemplate = (name: string): string => {
  let file = "";
  file = fs.readFileSync(path.join(template_folder, name + ".hbs")).toString();
  return file;
};

export default { getTemplate };
