"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Head from "next/head";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const hashPassword = async (password: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const hashedPassword = await hashPassword(password); //  ハッシュ化されたパスワード

      const response = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT + "/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_mail: username,
          user_password: hashedPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.access_token;
        localStorage.setItem("token", token);
        router.push("/user"); // Redirect to user profile page
      } else {
        throw new Error("ログインに失敗しました。");
      }
    } catch (error) {
      console.error(error);
      alert("ログイン中にエラーが発生しました。");
    }
  };

  return (
    <>
      <Head>
        <title>Login</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 px-6 font-sans">
        <div className="max-w-md w-full">
          <div className="text-center mb-2">
            <h2 className="text-left text-l font-extrabold text-gray-600 mt-6">SNSアカウントでログイン</h2>
            <div className="flex flex-col space-y-4 mt-2">
              <button className="group relative w-full flex items-center py-2 px-4 border border-transparent rounded-md text-white bg-gray-700 hover:bg-gray-900 focus:outline-none">
                <img src="/x.png" alt="X" className="h-5 w-5 ml-4 mr-2" />
                <span className="flex-grow text-center">Xでログイン</span>
              </button>
              <button className="group relative w-full flex items-center py-2 px-4 border border-transparent rounded-md text-white bg-green-500 hover:bg-green-700 focus:outline-none btn-line">
                <img src="/LINE.png" alt="LINE" className="h-6 w-6 ml-4 mr-2" />
                <span className="flex-grow text-center">LINEでログイン</span>
              </button>
              <button className="group relative w-full flex items-center py-2 px-4 border border-transparent rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none">
                <img src="/fb.png" alt="Facebook" className="h-6 w-6 ml-4 mr-2" />
                <span className="flex-grow text-center">Facebookでログイン</span>
              </button>
            </div>
          </div>
          <h2 className="text-left text-l font-extrabold text-gray-600 mt-10 mb-0">メールアドレスでログイン</h2>
          <form className="space-y-2" onSubmit={handleLogin}>
            <input type="hidden" name="remember" value="true" />
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">
                  メールアドレス
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="appearance-none rounded-t-xl relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-800 focus:border-amber-800 focus:z-10 sm:text-sm"
                  placeholder="メールアドレス"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none rounded-b-xl relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-amber-800 focus:border-amber-800 focus:z-10 sm:text-sm"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="mt-6 group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-800"
              >
                ログインする
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
