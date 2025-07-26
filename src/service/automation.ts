import { ElementHandle, Page, TimeoutError } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

import { readFromFile } from '../lib/io.js';
import Logger from '../lib/logger.js';
import { sendMessage } from '../lib/telegram.js';

// Helper function for sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fillGuarantorDetails(
  page: Page,
  nationalCode: string,
  mobileNumber: string,
): Promise<void> {
  await page.waitForSelector('#nationalCode', { visible: true });
  await page.type('#nationalCode', nationalCode);

  await page.waitForSelector('#mobileNo', { visible: true });
  await page.type('#mobileNo', mobileNumber);
}

async function fillGuarantorSalary(page: Page, salary: string): Promise<void> {
  await page.waitForSelector('#monthlyIncome-facilityGuarantor-0', {
    visible: true,
  });
  await page.type('#monthlyIncome-facilityGuarantor-0', salary);
}

// Main automation function
async function runAutomation(): Promise<void> {
  puppeteer.use(StealthPlugin());

  const {
    DOCUMENTS_BIRTH_CERTIFICATE,
    DOCUMENTS_DIRECTORY,
    DOCUMENTS_GUARANTOR,
    DOCUMENTS_MARRIAGE_CERTIFICATE,
    DOCUMENTS_SPOUSE_BIRTH_CERTIFICATE,
    LOGIN_PASSWORD,
    LOGIN_USERNAME,
    MOBILE_NUMBER_GUARANTOR,
    NATIONAL_CODE_GUARANTOR,
    SALARY_GUARANTOR,
  } = process.env;

  if (
    !LOGIN_USERNAME ||
    !LOGIN_PASSWORD ||
    !NATIONAL_CODE_GUARANTOR ||
    !MOBILE_NUMBER_GUARANTOR ||
    !SALARY_GUARANTOR ||
    !DOCUMENTS_DIRECTORY ||
    !DOCUMENTS_BIRTH_CERTIFICATE ||
    !DOCUMENTS_MARRIAGE_CERTIFICATE ||
    !DOCUMENTS_SPOUSE_BIRTH_CERTIFICATE ||
    !DOCUMENTS_GUARANTOR
  ) {
    throw new Error('Required environment variables are missing.');
  }

  // Retry logic based on the time of day
  const hour = new Date().getHours(); // Local time hour (0–23)
  if (hour < 5 || hour >= 17) {
    Logger.info('Out of operating hours, retrying in 5 minutes...');
    await sleep(300000); // Wait 5 minutes before retrying
    return runAutomation(); // Retry automation
  }

  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-session-crashed-bubble',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--noerrdialogs',
      '--disable-gpu',
      '--start-maximized',
    ],
    defaultViewport: null,
    headless: false,
  });

  const page = await browser.newPage();

  try {
    Logger.info('Navigating to login page...');
    await page.goto('https://ebanking.bankmellat.ir/ebanking/', {
      waitUntil: 'load',
    });

    Logger.info('Filling in credentials...');
    await page.type('#UserNameBox', LOGIN_USERNAME);
    await page.type('#PasswordBox', LOGIN_PASSWORD);

    Logger.info('Requesting OTP...');
    await page.click('#s-otp-but-login');

    Logger.info('Waiting for valid OTP...');
    const otpCode = await waitForValidOTP();
    if (!otpCode) {
      throw new Error('OTP not received in time.');
    }

    Logger.info('Entering OTP...');
    await page.type('#OTPBox', otpCode);

    Logger.info('Submitting login...');
    await page.click('#login-bt');

    Logger.info('Navigating to loan section...');
    await page.waitForSelector(
      '#router > div > div > div:nth-child(2) > div:nth-child(1) > div > div > div > span',
      { visible: true },
    );
    await page.click(
      '#router > div > div > div:nth-child(2) > div:nth-child(1) > div > div > div > span',
    );

    Logger.info('Clicking on edit loan...');
    await page.waitForSelector('#edit_14040119964914', { visible: true });
    await page.click('#edit_14040119964914');

    await sleep(5000); // Wait for form to load

    Logger.info('Checking for warning modal...');

    try {
      await page.waitForSelector('#msgBoxf', { timeout: 200, visible: true });
      throw new Error('Warning dialog appeared in the first step.');
    } catch (err) {
      if (err instanceof TimeoutError) {
        Logger.info('No warning detected. Continuing...');
      } else {
        throw err;
      }
    }

    Logger.info('Clicking on terms and condition checkbox...');
    await page.click(
      '#rowtermsAndConditionsjobInfoConfirmed > div > form > div > div > label',
    );

    Logger.info('Clicking on next...');
    await page.click('#confirmRequest');

    Logger.info('Clicking on marriage loan option...');
    await page.waitForSelector('#detail_746_12_0_0_3000000000', {
      visible: true,
    });
    await page.click('#detail_746_12_0_0_3000000000');

    Logger.info('Uploading documents...');
    await uploadDocuments(
      page,
      DOCUMENTS_DIRECTORY,
      DOCUMENTS_BIRTH_CERTIFICATE.split(','),
      '1002#1',
    ); // Birth Certificate
    await uploadDocuments(
      page,
      DOCUMENTS_DIRECTORY,
      DOCUMENTS_MARRIAGE_CERTIFICATE.split(','),
      '3001#1',
    ); // Marriage Certificate
    await uploadDocuments(
      page,
      DOCUMENTS_DIRECTORY,
      DOCUMENTS_SPOUSE_BIRTH_CERTIFICATE.split(','),
      '3002#1',
    ); // Spouse Birth Certificate

    Logger.info('Clicking on guarantor details...');
    await page.click('#facility-guarantor-show-0');

    Logger.info('Filling guarantor details...');
    await fillGuarantorDetails(
      page,
      NATIONAL_CODE_GUARANTOR,
      MOBILE_NUMBER_GUARANTOR,
    );

    Logger.info('Reviewing the loan application...');
    await page.click('#review');

    Logger.info('Accepting the fee...');
    await page.waitForSelector('#rowconfirmed > div > form > div > div', {
      visible: true,
    });
    await page.click('#rowconfirmed > div > form > div > div');

    Logger.info('Submitting the application...');
    await page.click('#inquiry');
    await page.waitForSelector('#save', { visible: true });
    await page.click('#save');

    Logger.info('Filling Guarantor salary...');
    await fillGuarantorSalary(page, SALARY_GUARANTOR);

    Logger.info("Uploading Guarantor's documents...");
    await uploadGuarantorDocuments(
      page,
      DOCUMENTS_DIRECTORY,
      DOCUMENTS_GUARANTOR.split(','),
    ); // Guarantor Documents

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      Logger.info('Clicking next button...');
      await page.click('#frm-bt');

      await sleep(500); // short wait to let loading start
      Logger.info('Waiting for loading to disappear (up to 2 minutes)...');

      try {
        await page.waitForSelector('#loading-wrap1', {
          hidden: true,
          timeout: 120000,
        });

        // Check if error box is present and visible
        const errorBox = await page.$('#error-box');
        if (errorBox && (await errorBox.isVisible())) {
          const errorBoxText = await page.$eval('#error-box', (el) =>
            (el as HTMLElement).innerText.trim(),
          );

          Logger.warn(`Error box appeared with message: ${errorBoxText}`);
          // await sendMessage(errorBoxText, true);

          const dismissBtn = await page.$(
            '#error-box > i.fa.fa-times.er-times',
          );
          if (dismissBtn) {
            await dismissBtn.click();
            Logger.info('Dismissed the error box.');
          } else {
            Logger.warn('Dismiss button not found.');
          }

          Logger.info('Retrying after dismissing the error box...');
          continue; // try again
        }

        // If error box not visible, assume success
        Logger.info('No error box. Assuming loan is ready.');
        await sendMessage('LOAN IS READY!', false);
        break;
      } catch (err) {
        if (err instanceof TimeoutError) {
          throw new Error('Loading took too long.');
        }

        // Unknown error — propagate it
        throw err;
      }
    }

    Logger.info('Process completed successfully.');
  } catch (err) {
    Logger.error('An error occurred during automation:', err);
    await browser.close();
    await sleep(120000); // Wait before retrying
    return runAutomation(); // Retry automation
  }
}

async function uploadDocuments(
  page: Page,
  directory: string,
  documents: string[],
  docTypeValue: string,
): Promise<void> {
  await page.waitForSelector('#applicantDocTypeList', { visible: true });
  await page.select('#applicantDocTypeList', docTypeValue);

  const fileInput = (await page.waitForSelector(
    '#applicantFileInput',
  )) as ElementHandle<HTMLInputElement>;

  for (const document of documents) {
    await fileInput.uploadFile(`${directory}/${document}`);
    await page.click('#applicantAddDocBtn');
  }
}

async function uploadGuarantorDocuments(
  page: Page,
  directory: string,
  documents: string[],
): Promise<void> {
  await page.waitForSelector('#guarantorDocTypeList-facilityGuarantor-0', {
    visible: true,
  });
  await page.select('#guarantorDocTypeList-facilityGuarantor-0', '2001#1'); // Guarantor documents value in dropdown

  const fileInput = (await page.waitForSelector(
    '#guarantorFileInput-facilityGuarantor-0',
  )) as ElementHandle<HTMLInputElement>;

  for (const document of documents) {
    await fileInput.uploadFile(`${directory}/${document}`);
    await page.click(
      '#guarantorUploadBox-facilityGuarantor-0 > div.mt-md-4.wizard-form-fileDownload.link-gradiant.center-child > div',
    );
  }
}

async function waitForValidOTP(): Promise<null | string> {
  for (let retries = 0; retries < 120; retries++) {
    const otpData = await readFromFile();

    const otpTime = new Date(otpData.time).getTime();
    const now = Date.now();
    const isOtpValid = now - otpTime <= 5000; // OTP is valid if within 5 seconds
    if (isOtpValid) {
      return otpData.code;
    }

    await sleep(1000); // Wait for 1 second before retrying
  }
  return null;
}

export default runAutomation;
