import fs from "fs";
import path from "path";
import mjml from "mjml";

const template_folder = "../../resources/email/templates";

const compileTemplates = () => {
  fs.readdir(template_folder, (err, files) => {
    if (err) console.log(err);

    files.forEach(file => {

        if(path.extname(file) !== ".mjml") return;
        

        let content = fs.readFileSync(template_folder + files)
        let mjmlres = mjml(content.toString());

        let hbs = template_folder + file.replace(".mjml",".hbs");
        fs.writeFileSync(hbs,mjmlres.html);
    })
  });
};
