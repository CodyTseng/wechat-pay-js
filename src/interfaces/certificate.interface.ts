export interface Certificate {
  effective_time: string;
  certificate: string;
  expire_time: string;
  serial_no: string;
}

export interface GetCertificatesResult {
  data: {
    effective_time: string;
    encrypt_certificate: {
      algorithm: string;
      associated_data: string;
      ciphertext: string;
      nonce: string;
    };
    expire_time: string;
    serial_no: string;
  }[];
}
