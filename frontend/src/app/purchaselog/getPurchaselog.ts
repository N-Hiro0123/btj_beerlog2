import axios from "axios";
import { PurchaselogPage } from "../../types/purchase_types";

export const fetchPurchaselog = async (jwt: string, page: number = 1): Promise<PurchaselogPage> => {
  const response = await axios.get<PurchaselogPage>(`${process.env.NEXT_PUBLIC_API_ENDPOINT}/purchaselog`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
    },
    params: {
      page: page, // クエリパラメータとしてページ番号を指定
    },
  });
  return response.data;
};
