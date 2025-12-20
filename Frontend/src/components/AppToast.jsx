import { toast } from "sonner";

/**
 * App-wide toast helper
 *
 * @param {Object} options
 * @param {"success" | "error" | "info" | "warning"} options.type
 * @param {string} options.title
 * @param {string} [options.description]
 */
const AppToast = ({ type = "info", title, description }) => {
  toast[type](title, {
    description,
  });
};

export default AppToast;