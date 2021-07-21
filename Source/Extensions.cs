using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Text;
using System.Threading.Tasks;

namespace TranspilerExplorer
{
    public static class Extensions
    {
        public static void WriteBytes(this HttpListenerResponse resp, byte[] data)
        {
            resp.ContentLength64 = data.LongLength;
            resp.OutputStream.Write(data, 0, data.Length);
        }

        public static void WriteJson(this HttpListenerResponse resp, JObject obj)
        {
            var data = Encoding.UTF8.GetBytes(obj.ToString());
            resp.ContentType = "application/json";
            resp.ContentEncoding = Encoding.UTF8;
            resp.ContentLength64 = data.LongLength;
            resp.OutputStream.Write(data, 0, data.Length);
        }

        public static string PathPart(this Uri url, int index)
        {
            return url.AbsolutePath.Split(new[] { '/' }, StringSplitOptions.RemoveEmptyEntries).ElementAtOrDefault(index);
        }
    }
}
