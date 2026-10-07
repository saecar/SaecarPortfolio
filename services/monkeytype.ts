import axios from "axios";

import { MONKEYTYPE_ACCOUNT } from "@/common/constants/monkeytype";

const { username, api_key } = MONKEYTYPE_ACCOUNT;

const USER_ENDPOINT = `https://api.monkeytype.com/users/${username}/profile`;

export const getMonkeytypeData = async () => {
  try {
    if (!api_key) {
      return { status: 200, data: {} };
    }
    const response = await axios.get(USER_ENDPOINT, {
      headers: {
        Authorization: `ApeKey ${api_key}`,
      },
      timeout: 5000,
    });

    const status = response.status;
    const responseJson = response.data;

    if (status >= 400) {
      return { status, data: {} };
    }

    return { status, data: responseJson?.data || {} };
  } catch (error) {
    return { status: 200, data: {} };
  }
};
