interface EnvConfig {
  PRODUCTION: string;
  API_LOCALHOST: string;
  API_PROD: string;
}

const env: EnvConfig = {
  PRODUCTION: process.env.NEXT_PUBLIC_PRODUCTION!,
  API_LOCALHOST: process.env.NEXT_PUBLIC_LOCAL_API_URL!,
  API_PROD: process.env.NEXT_PUBLIC_PROD_API_URL!,
};

const apiBasePath =
  env.PRODUCTION !== "0" ? `${env.API_PROD}` : `${env.API_LOCALHOST}`;

export default apiBasePath;
