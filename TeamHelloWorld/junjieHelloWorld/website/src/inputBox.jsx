import React, {useState} from 'react'

function InputBox(){
    const [ingredients, setIngredients] = useState([]);
    const [newIngredient, setNewIngredient] = useState("");

    function handleInputChange(event){
        setNewIngredient(event.target.value);
    }

    function addIngredient(){
        if(newIngredient.trim() !== "")
        {
            setIngredients(i => [...i, newIngredient]);
            setNewIngredient("");
        }
    }

    function deleteIngredient(index){
        const updatedIngredients = ingredients.filter((_, i) => i !== index);
        setIngredients(updatedIngredients);
    }

    return(
        <>
        <div className="input">
            <h1>Enter Available Ingredients!</h1>

            <div>
                <input type="text" placeholder="Enter your ingredients" value={newIngredient} onChange={handleInputChange}></input>
                <button className="inputCook" onClick={addIngredient}>Add this ingredient!</button>
            </div>

            <ul className="no-labels">
                {ingredients.map((ingre, index) => 
                    <li key={index}>
                        <span className="ingre">{ingre}</span>
                        <button className="delete-button" onClick={() => deleteIngredient(index)}>Delete</button>
                    </li>
                )}
            </ul>
        </div>
        </>
    );
}

export default InputBox
