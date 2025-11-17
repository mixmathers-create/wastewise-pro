package receiptservice.com.receiptservice;


interface PSAMCallback {
        void success(in byte[] data);
        void error(int errorCode,String errorMsg);
}