import { useState, useEffect } from "react";
import { supabase_two } from "./supa_client.js";

export default function SupaApp({ UserEmail, userPasswd, fullName }) {
  const [todos, setTodos] = useState([]);

  const signUp = async () => {
    const { data, error } = await supabase_two.auth.signUp({
      email: UserEmail,
      password: userPasswd,
    });

    if (error) throw error;

    if (data.user) {
      await supabase_two.from("profiles").insert({
        id: data.user.id,
        email: UserEmail,
        full_name: fullName,
        role: "client",
      });
    }
  };
  useEffect(() => {
    async function getTodos() {
      const { data: todos } = await supabase_two.from("todos").select();

      if (todos) {
        setTodos(todos);
      }
    }

    getTodos();
  }, []);

  return (
    <div>
      {todos.map((todo) => (
        <div key={todo.id}>
          <p> {UserEmail} </p>
          <p onClick={signUp}>{todo.name}</p>
        </div>
      ))}
    </div>
  );
}
