import axios from "axios";

export const createVerificationUser = async (data:any) => {
  const url = "https://api-v3.authenticating.com/user/create";

  // const data = {
  //   firstName: "Jonathan",
  //   middleName: "Gob",
  //   lastName: "Zinx",
  //   dob: "22-05-1990",
  //   email: "jonathan@authenticating.com",
  //   phone: "+19321765432",
  //   houseNumber: "504A",
  //   streetName: "121, 9th ST",
  //   address: "121, 9th ST, APT 12111",
  //   city: "Santa Monica",
  //   state: "CA",
  //   zipCode: "90411",  
  //   ssn: "123456789",
  //   country: "USA",
  // };

  try {
    const response = await axios.post(url, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer NVOT6PSJLJ2CYKLXIVREYY22GJRTWSRUI47G6ULXGIYE63RX`, // 🔥 REQUIRED
      },
    });

    return response.data;
  } catch (error: any) {
    console.error("Error creating user:", error?.response?.data || error.message);
    return { success: false, message: error?.response?.data || error.message };
  }
};

export const submitUserConsent = async (userAccessCode: string, fullName: string) => {
  const url = "https://api-v3.authenticating.com/user/consent";
  const data = {
    userAccessCode: userAccessCode,
    isBackgroundDisclosureAccepted: true,
    GLBPurposeAndDPPAPurpose: true,
    FCRAPurpose: true,
    fullName: fullName,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer NVOT6PSJLJ2CYKLXIVREYY22GJRTWSRUI47G6ULXGIYE63RX`,
      },
    });
    return response.data; // Return the response data
  } catch (error: any) {
    console.error("Error submitting user consent:", error);
    return { success: false, message: error.message }; // Return error details
  }
};

export const getMedalionJWT = async (userAccessCode: string) => {
  const url = "https://api-v3.authenticating.com/user/jwt";
  const data = {
    userAccessCode: userAccessCode,
    // redirectURL:'http://206.162.244.144:4008/medallion-return'
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer NVOT6PSJLJ2CYKLXIVREYY22GJRTWSRUI47G6ULXGIYE63RX`,
      },
    });
    return response.data; // Return the response data
  } catch (error: any) {
    console.error("Error fetching test result:", error);
    return { success: false, message: error.message }; // Return error details
  }
};
export const getTestResult = async (userAccessCode: string) => {
  const url = "https://api-v3.authenticating.com/user/getTestResult";
  const data = {
    userAccessCode: userAccessCode,
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer NVOT6PSJLJ2CYKLXIVREYY22GJRTWSRUI47G6ULXGIYE63RX`,
      },
    });
    return response.data; // Return the response data
  } catch (error: any) {
    console.error("Error fetching test result:", error);
    return { success: false, message: error.message }; // Return error details
  }
};
